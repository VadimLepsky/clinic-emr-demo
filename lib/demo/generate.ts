// Demo data generator. Fixed seed, every date counted from today, so the demo always looks current and the server
// and the browser build exactly the same data. lib/mock-data.ts calls it once; lib/data.ts reads the result.
//
// The story: 60 patients go through clinical episodes (lib/demo/scenarios.ts) over the last six months — a GP visit,
// a scan, a specialist, a follow-up — and every visit leaves a document from the template version of its day,
// a care plan from the recommended services, payments that lock the plan, lab results uploaded as files, and an
// activity log. Today every doctor has a list of appointments; the morning ones already have notes.
import type {
  AuditEntry, ClinicSettings, CrmVisit, DocumentValues, FieldBlock, FieldValue, FileRecord, Folder, Letterhead,
  MedDocument, Patient, Prescription, PrescriptionFulfillment, PrescriptionItem, Service, ServicePackage,
  ServiceSelection, ServicesBlock, Staff, Template, TemplateKind, TemplateSchema, TemplateVersion,
} from '../types'
import { carePlanTitle } from '../format'
import {
  BUNDLES, CARDIO_ID, CLINIC_SETTINGS, ENDO_ID, FOLDERS, FRONT_DESK_ID, GASTRO_ID, GYN_ID, LETTERHEADS, MANAGER_ID,
  NEURO_ID, NURSE_IDS, SERVICES, STAFF, US_ID, service,
} from './catalog'
import { buildPatients } from './people'
import { addDays, addMinutes, at, createRng, daysBetween, minutesOf, weekday, type Rng } from './random'
import {
  EPISODE_GROUPS, EPISODES, REPEATABLE_EPISODES, scenarioById, type CaseText, type Episode, type EpisodeStep,
  type Scenario, type ServicePick, type Text, type Value, type ValueContext,
} from './scenarios'
import { buildTemplates } from './templates'

export const DEMO_SEED = 20_261_024
const HISTORY_DAYS = 182
/** Care plans older than this with nothing done show up in «Needs attention» (manager home). */
const STALE_DAYS = 14

export type DemoData = {
  staff: Staff[]
  currentUserId: string
  patients: Patient[]
  services: Service[]
  servicePackages: ServicePackage[]
  folders: Folder[]
  templates: Template[]
  templateVersions: TemplateVersion[]
  documents: MedDocument[]
  files: FileRecord[]
  prescriptions: Prescription[]
  prescriptionItems: PrescriptionItem[]
  prescriptionFulfillments: PrescriptionFulfillment[]
  crmVisits: CrmVisit[]
  clinicSettings: ClinicSettings
  letterheads: Letterhead[]
  auditLog: AuditEntry[]
}

// Today's appointments per doctor and how many of them (the first ones) already have a note.
const TODAY_PLAN: Record<string, { appointments: number; notes: number; start: number; slot: number }> = {
  'st-2': { appointments: 8, notes: 3, start: 8 * 60 + 30, slot: 30 },
  'st-3': { appointments: 7, notes: 1, start: 9 * 60, slot: 30 },
  [ENDO_ID]: { appointments: 6, notes: 1, start: 8 * 60 + 30, slot: 40 },
  [CARDIO_ID]: { appointments: 6, notes: 1, start: 9 * 60, slot: 40 },
  [GYN_ID]: { appointments: 6, notes: 1, start: 8 * 60 + 30, slot: 30 },
  [NEURO_ID]: { appointments: 5, notes: 0, start: 10 * 60, slot: 40 },
  [GASTRO_ID]: { appointments: 5, notes: 1, start: 9 * 60, slot: 40 },
  [US_ID]: { appointments: 7, notes: 1, start: 8 * 60, slot: 20 },
}

const SPECIALISTS: Record<Exclude<Scenario['doctor'], 'gp'>, string> = {
  endo: ENDO_ID, cardio: CARDIO_ID, gyn: GYN_ID, neuro: NEURO_ID, gastro: GASTRO_ID, us: US_ID,
}

const DEFAULT_DURATIONS = ['2 weeks', '3 weeks', 'a month', '2 months', '3 months']
const NUMBER_PREFIX: Record<TemplateKind, [prefix: string, start: number]> = {
  consultation: ['CN-', 1040], ultrasound: ['US-', 310], lab: ['LAB-', 80], certificate: ['CRT-', 120], other: ['DOC-', 60],
}

type Visit = {
  patient: Patient
  scenario: Scenario
  caseIndex: number | null
  doctorId: string
  date: string
  minutes: number
  today: boolean
  /** Today's appointment that already has a note. */
  done: boolean
  long: boolean
}

/** A step that falls on or after today; `earliest` — the first day it could happen after the previous step. */
type Pending = Omit<Visit, 'minutes' | 'today' | 'done' | 'long'> & { earliest: string }

type PlanMeta = {
  rx: Prescription
  items: PrescriptionItem[]
  scenario: Scenario | null
  patient: Patient
  manual: boolean
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const round2 = (value: number) => Math.round(value * 100) / 100

function schemaFields(schema: TemplateSchema): FieldBlock[] {
  return schema.sections.flatMap((s) =>
    s.blocks.flatMap((b) => (b.kind === 'field' ? [b] : b.kind === 'group' ? b.blocks : [])),
  )
}

function serviceBlocks(schema: TemplateSchema): ServicesBlock[] {
  return schema.sections.flatMap((s) => s.blocks).filter((b): b is ServicesBlock => b.kind === 'services')
}

export function generateDemoData(today = new Date().toISOString().slice(0, 10), seed = DEMO_SEED): DemoData {
  const rng = createRng(seed)
  const staff: Staff[] = STAFF.map(({ completion: _completion, ...member }) => member)
  const completionOf = new Map(STAFF.map((s) => [s.id, s.completion]))
  const patients = buildPatients(rng, today)
  const templates = buildTemplates(today)
  const gpOf = new Map(patients.map((p, i) => [p.id, i % 2 === 0 ? 'st-2' : 'st-3']))
  const ageOf = (p: Patient) => (p.birth_date ? daysBetween(p.birth_date, today) / 365.25 : 41)

  // ============ 1. Visits: episodes spread over the last six months ============

  const episodesOf = new Map<string, string[]>(patients.map((p) => [p.id, []]))
  const busyDays = new Map<string, Set<string>>(patients.map((p) => [p.id, new Set()]))
  const visits: Visit[] = []
  const pending: Pending[] = []

  const doctorFor = (scenario: Scenario, patient: Patient) =>
    scenario.doctor === 'gp' ? gpOf.get(patient.id)! : SPECIALISTS[scenario.doctor]

  const fitsScenario = (scenario: Scenario, patient: Patient) => {
    const age = ageOf(patient)
    if (age < scenario.ages[0] || age > scenario.ages[1] + 0.99) return false
    if (scenario.sex && patient.sex !== scenario.sex) return false
    return !scenario.cases || scenario.cases.some((c) => fitsCase(c, age))
  }
  const fitsCase = (c: { childOnly?: boolean; adultOnly?: boolean }, age: number) =>
    !(c.childOnly && age >= 12) && !(c.adultOnly && age < 12)

  const mayStart = (episode: Episode, patient: Patient) => {
    const own = episodesOf.get(patient.id)!
    if (own.includes(episode.id) && !REPEATABLE_EPISODES.includes(episode.id)) return false
    if (EPISODE_GROUPS.some((g) => g.includes(episode.id) && own.some((e) => e !== episode.id && g.includes(e)))) return false
    return episode.steps.every((step) => fitsScenario(scenarioById.get(step.scenario)!, patient))
  }

  const chooseCase = (scenario: Scenario, step: EpisodeStep | undefined, previous: number | null, patient: Patient) => {
    if (!scenario.cases) return null
    const age = ageOf(patient)
    const fitting = scenario.cases.map((c, i) => (fitsCase(c, age) ? i : -1)).filter((i) => i >= 0)
    if (step?.sameCase && previous !== null && fitting.includes(previous)) return previous
    const allowed = step?.cases ? fitting.filter((i) => step.cases!.includes(i)) : fitting
    return rng.pick(allowed.length ? allowed : fitting)
  }

  const freeDay = (patient: Patient, date: string) => {
    let day = date
    while (weekday(day) === 0 || busyDays.get(patient.id)!.has(day)) day = addDays(day, 1)
    return day
  }

  const historyMinutes = () => 8 * 60 + 30 + 15 * rng.int(0, 36)

  /** Least busy eligible patient, random among equals. */
  const choosePatient = (candidates: Patient[]) => {
    const fewest = Math.min(...candidates.map((p) => episodesOf.get(p.id)!.length))
    return rng.pick(candidates.filter((p) => episodesOf.get(p.id)!.length === fewest))
  }

  // Most constrained episodes first, so the few patients who fit them are still free.
  const ordered = [...EPISODES].sort(
    (a, b) => patients.filter((p) => mayStart(a, p)).length - patients.filter((p) => mayStart(b, p)).length,
  )
  const startEpisode = (episode: Episode, patient: Patient) => {
      episodesOf.get(patient.id)!.push(episode.id)
      // Half spread evenly, half weighted towards recent weeks: the clinic is growing.
      const daysAgo = rng.chance(0.5) ? rng.int(1, HISTORY_DAYS) : Math.max(1, Math.round(HISTORY_DAYS * (1 - Math.sqrt(rng.next()))))
      let date = addDays(today, -daysAgo)
      let previousCase: number | null = null
      let earliest = date
      for (const [i, step] of episode.steps.entries()) {
        if (i > 0) {
          if (step.chance !== undefined && !rng.chance(step.chance)) break
          earliest = addDays(date, step.gap![0])
          date = addDays(date, rng.int(step.gap![0], step.gap![1]))
        }
        const scenario = scenarioById.get(step.scenario)!
        const caseIndex = chooseCase(scenario, step, previousCase, patient)
        previousCase = caseIndex
        const doctorId = doctorFor(scenario, patient)
        date = freeDay(patient, date)
        if (date >= today) {
          pending.push({ patient, scenario, caseIndex, doctorId, date, earliest })
          break
        }
        busyDays.get(patient.id)!.add(date)
        visits.push({ patient, scenario, caseIndex, doctorId, date, minutes: historyMinutes(), today: false, done: false, long: false })
      }
  }
  for (const episode of ordered) {
    for (let k = 0; k < episode.count; k++) {
      const candidates = patients.filter((p) => mayStart(episode, p))
      if (!candidates.length) break
      startEpisode(episode, choosePatient(candidates))
    }
  }
  // Everyone has a history: a patient the episodes missed gets a common visit.
  const common = EPISODES.filter((e) => ['urti', 'annual', 'screening', 'uti', 'hypertension', 'certificate'].includes(e.id))
  for (const patient of patients.filter((p) => !visits.some((v) => v.patient.id === p.id))) {
    const episode = rng.pick(common.filter((e) => mayStart(e, patient)))
    if (episode) startEpisode(episode, patient)
  }

  // ============ 2. Today's appointments ============
  // Continuations due soon come first (the endocrinologist sees the patient the GP referred), then new patients.

  const seenToday = new Set<string>()
  const todayVisits: Visit[] = []
  for (const [doctorId, plan] of Object.entries(TODAY_PLAN)) {
    const chosen: Pending[] = pending
      .filter((p) => p.doctorId === doctorId && p.earliest <= today && daysBetween(today, p.date) <= 21 && !seenToday.has(p.patient.id))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, Math.ceil(plan.appointments / 2))
    chosen.forEach((p) => seenToday.add(p.patient.id))

    const starting = EPISODES.filter((e) => {
      const first = scenarioById.get(e.steps[0].scenario)!
      return first.doctor === 'gp' ? doctorId === 'st-2' || doctorId === 'st-3' : SPECIALISTS[first.doctor] === doctorId
    })
    let guard = 0
    while (chosen.length < plan.appointments && guard++ < 500) {
      const episode = rng.pick(starting)
      const scenario = scenarioById.get(episode.steps[0].scenario)!
      const candidates = patients.filter(
        (p) => !seenToday.has(p.id) && mayStart(episode, p) && doctorFor(scenario, p) === doctorId,
      )
      if (!candidates.length) continue
      const patient = choosePatient(candidates)
      episodesOf.get(patient.id)!.push(episode.id)
      seenToday.add(patient.id)
      chosen.push({ patient, scenario, caseIndex: chooseCase(scenario, episode.steps[0], null, patient), doctorId, date: today, earliest: today })
    }

    let minutes = plan.start
    rng.shuffle(chosen).forEach((p, i) => {
      if (i > 0 && rng.chance(0.2)) minutes += plan.slot
      const { earliest: _earliest, ...visit } = p
      todayVisits.push({ ...visit, date: today, minutes, today: true, done: i < plan.notes, long: false })
      minutes += plan.slot
    })
  }

  // Two or three notes run to two pages: the latest heart failure, migraine and diabetes reviews in the history.
  for (const id of ['cardio-hf', 'neuro-migraine', 'endo-t2dm']) {
    const latest = visits
      .filter((v) => v.scenario.id === id && v.scenario.long && v.caseIndex !== (id === 'endo-t2dm' ? 2 : 1))
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    if (latest) latest.long = true
  }

  const allVisits = [...visits, ...todayVisits.filter((v) => v.done)].sort(
    (a, b) => a.date.localeCompare(b.date) || a.minutes - b.minutes,
  )

  // ============ 3. Documents and care plans ============

  const documents: MedDocument[] = []
  const prescriptions: Prescription[] = []
  const prescriptionItems: PrescriptionItem[] = []
  const plans: PlanMeta[] = []
  const audit: Omit<AuditEntry, 'id'>[] = []
  const numbers = new Map<TemplateKind, number>()

  const log = (entry: Omit<AuditEntry, 'id' | 'actor_type'> & { actor_type?: AuditEntry['actor_type'] }) =>
    audit.push({ actor_type: 'staff', ...entry })

  for (const visit of allVisits) {
    const template = templates.template(visit.scenario.template)
    const version = templates.versionOn(visit.scenario.template, visit.date)
    const note = buildNote(rng, visit, version.schema)
    const [prefix, start] = NUMBER_PREFIX[template.kind]
    const seq = (numbers.get(template.kind) ?? start) + 1
    numbers.set(template.kind, seq)

    const created = at(visit.date, Math.min(visit.minutes + rng.int(12, 28), 19 * 60))
    const doc: MedDocument = {
      id: `d-${documents.length + 1}`, patient_id: visit.patient.id, kind: 'template', template_version_id: version.id,
      folder_id: template.folder_id, title: template.name, number: `${prefix}${String(seq).padStart(6, '0')}`,
      document_date: visit.date, values: note.values, author_id: visit.doctorId, created_at: created, updated_at: created,
    }
    documents.push(doc)
    log({ at: created, actor_id: visit.doctorId, action: 'create', entity_type: 'document', entity_id: doc.id, patient_id: doc.patient_id, description: `Created document «${doc.title}»` })
    if (!visit.today && rng.chance(0.1)) {
      doc.updated_at = addMinutes(created, rng.int(40, 180))
      log({ at: doc.updated_at, actor_id: visit.doctorId, action: 'update', entity_type: 'document', entity_id: doc.id, patient_id: doc.patient_id, description: `Updated document «${doc.title}»` })
    }
    if (rng.chance(visit.today ? 0.5 : 0.6)) {
      log({ at: addMinutes(doc.updated_at, 2), actor_id: visit.doctorId, action: 'print', entity_type: 'document', entity_id: doc.id, patient_id: doc.patient_id, description: `Printed document «${doc.title}»` })
    }

    if (!note.selections.length) continue
    const rx: Prescription = {
      id: `rx-${prescriptions.length + 1}`, patient_id: visit.patient.id, doctor_id: visit.doctorId, source_document_id: doc.id,
      title: carePlanTitle(visit.date), valid_until: addDays(visit.date, 30), external_recommendations: note.externalText,
      status: 'active', locked_at: null, created_at: created, deleted_at: null, deleted_by: null,
    }
    const items: PrescriptionItem[] = []
    for (const sel of note.selections) {
      const svc = sel.serviceId ? SERVICES.find((s) => s.id === sel.serviceId)! : null
      const item: PrescriptionItem = {
        id: `ri-${prescriptionItems.length + 1}`, prescription_id: rx.id, service_id: svc?.id ?? null,
        custom_name: svc ? null : sel.customName!, section: sel.category, quantity: 1, unit_price: svc?.price ?? 0, discount_pct: 0,
      }
      prescriptionItems.push(item)
      items.push(item)
    }
    prescriptions.push(rx)
    plans.push({ rx, items, scenario: visit.scenario, patient: visit.patient, manual: false })
    log({
      at: created, actor_type: 'system', actor_id: null, action: 'create', entity_type: 'prescription', entity_id: rx.id, patient_id: rx.patient_id,
      description: `Created a care plan from the ${template.kind === 'consultation' ? 'consultation note' : 'document'}`,
    })
  }

  // Manual care plans: repeat tests and courses a doctor adds between visits, without a note.
  const MANUAL: Record<string, [title: string, items: [code: string, qty: number][]][]> = {
    'st-2': [['Vitamin B12 injections', [['4002', 5], ['NL-102', 1]]], ['Repeat blood count and ferritin', [['4001', 1], ['3001', 1], ['3011', 1]]]],
    'st-3': [['Repeat liver function tests', [['4001', 1], ['3007', 1]]], ['Repeat blood count and ferritin', [['4001', 1], ['3001', 1], ['3011', 1]]]],
    [ENDO_ID]: [['Repeat diabetes tests', [['4001', 1], ['3010', 1], ['3008', 1], ['CL-201', 1]]], ['TSH check', [['4001', 1], ['3013', 1]]]],
    [CARDIO_ID]: [['Lipids and liver tests on a statin', [['4001', 1], ['3006', 1], ['3007', 1]]], ['Repeat 24-hour blood pressure monitoring', [['2003', 1]]]],
    [GYN_ID]: [['Follow-up pelvic ultrasound', [['2008', 1]]]],
  }
  const manualSources = rng.shuffle(visits.filter((v) => MANUAL[v.doctorId] && daysBetween(v.date, today) > 40)).slice(0, 16)
  for (const [i, source] of manualSources.entries()) {
    const [title, codes] = rng.pick(MANUAL[source.doctorId])
    const date = addDays(source.date, rng.int(25, Math.min(60, daysBetween(source.date, today) - 1)))
    if (weekday(date) === 0) continue
    const created = at(date, historyMinutes())
    const rx: Prescription = {
      id: `rx-${prescriptions.length + 1}`, patient_id: source.patient.id, doctor_id: source.doctorId, source_document_id: null,
      title, valid_until: addDays(date, 30), external_recommendations: null, status: 'active', locked_at: null,
      created_at: created, deleted_at: null, deleted_by: null,
    }
    const items = codes.map(([code, quantity]): PrescriptionItem => {
      const svc = service(code)
      const item: PrescriptionItem = {
        id: `ri-${prescriptionItems.length + 1}`, prescription_id: rx.id, service_id: svc.id, custom_name: null,
        section: svc.category, quantity, unit_price: svc.price, discount_pct: 0,
      }
      prescriptionItems.push(item)
      return item
    })
    prescriptions.push(rx)
    log({ at: created, actor_id: source.doctorId, action: 'create', entity_type: 'prescription', entity_id: rx.id, patient_id: rx.patient_id, description: `Created care plan «${title}»` })
    // One was created twice by mistake; the clinic manager deleted the copy.
    if (i === 3) {
      rx.deleted_at = addMinutes(created, 95)
      rx.deleted_by = MANAGER_ID
      log({ at: rx.deleted_at, actor_id: MANAGER_ID, action: 'delete', entity_type: 'prescription', entity_id: rx.id, patient_id: rx.patient_id, description: `Deleted care plan «${title}»` })
      continue
    }
    plans.push({ rx, items, scenario: null, patient: source.patient, manual: true })
  }

  // ============ 4. Discounts, payments and fulfilment ============

  const prescriptionFulfillments: PrescriptionFulfillment[] = []
  const ageDays = (plan: PlanMeta) => daysBetween(plan.rx.created_at.slice(0, 10), today)

  // A few old plans where nothing happened: «Needs attention» on the manager's home. Two of them are Dr Okafor's.
  const abandoned = new Set<string>()
  const oldPlans = rng.shuffle(plans.filter((p) => !p.manual && ageDays(p) > STALE_DAYS + 7))
  for (const doctorId of ['st-3', 'st-3', GASTRO_ID, CARDIO_ID, NEURO_ID]) {
    const plan = oldPlans.find((p) => p.rx.doctor_id === doctorId && !abandoned.has(p.rx.id))
    if (plan) abandoned.add(plan.rx.id)
  }

  // Today: for three of today's care plans the nurse already took the blood tests (and they were paid).
  const paidToday = new Set(
    plans
      .filter((p) => ageDays(p) === 0 && p.items.some((i) => i.section === 'lab' && i.service_id))
      .sort((a, b) => Number(b.rx.doctor_id === 'st-2') - Number(a.rx.doctor_id === 'st-2'))
      .slice(0, 3)
      .map((p) => p.rx.id),
  )

  for (const plan of plans) {
    const { rx, items } = plan
    const age = ageDays(plan)
    const created = rx.created_at

    if (rng.chance(0.13) && items.some((i) => i.service_id)) {
      const pct = rng.pick([5, 10, 10, 15])
      const onlyConsultation = rng.chance(0.3) ? items.find((i) => i.section === 'consultation' && i.service_id) : undefined
      for (const item of items) if (item.service_id && (!onlyConsultation || item === onlyConsultation)) item.discount_pct = onlyConsultation ? 20 : pct
      log({ at: addMinutes(created, rng.int(8, 35)), actor_id: FRONT_DESK_ID, action: 'update', entity_type: 'prescription', entity_id: rx.id, patient_id: rx.patient_id, description: `Changed the discount in care plan «${rx.title}»` })
    }
    if (rng.chance(0.45)) {
      log({ at: addMinutes(created, rng.int(10, 45)), actor_id: FRONT_DESK_ID, action: 'print', entity_type: 'prescription', entity_id: rx.id, patient_id: rx.patient_id, description: `Printed care plan «${rx.title}»` })
    }

    const fulfil = (item: PrescriptionItem, datetime: string) => {
      prescriptionFulfillments.push({
        id: `pf-${prescriptionFulfillments.length + 1}`, prescription_item_id: item.id, quantity: item.quantity,
        amount_paid: round2(item.unit_price * item.quantity * (1 - item.discount_pct / 100)), fulfilled_at: datetime,
      })
    }

    const clinicItems = items.filter((i) => i.service_id)
    if (abandoned.has(rx.id)) continue
    if (age === 0) {
      if (paidToday.has(rx.id)) {
        for (const item of clinicItems.filter((i) => i.section === 'lab')) fulfil(item, addMinutes(created, rng.int(15, 30)))
      }
    } else {
      const doctorFactor = completionOf.get(rx.doctor_id) ?? 1
      const p = clamp((plan.scenario?.completion ?? 0.75) * doctorFactor, 0.05, 0.97)
      // Fresh plans are still in progress: tests come first, specialist visits later — and sooner for patients who
      // follow through (the doctor's factor).
      const delayFor = (section: string) =>
        Math.round(
          (section === 'lab' || section === 'other' ? rng.int(0, 2) : section === 'instrumental' ? rng.int(0, 7) : rng.int(2, 12)) /
            doctorFactor,
        )
      // About p of the items, not a coin per item: a doctor's rate stays recognisable even over a few plans.
      const count = clamp(Math.round(p * clinicItems.length + rng.float(-0.6, 0.6, 2)), 0, clinicItems.length)
      const done = rng.shuffle(clinicItems).slice(0, count)
      const forced = !done.length && age >= STALE_DAYS && clinicItems.length > 0
      if (forced) done.push(clinicItems.find((i) => i.section === 'lab') ?? clinicItems[0])
      for (const item of done) {
        const delay = forced ? 0 : delayFor(item.section)
        let day = addDays(created.slice(0, 10), delay)
        if (weekday(day) === 0) day = addDays(day, 1)
        if (day >= today) continue
        fulfil(item, delay === 0 ? addMinutes(created, rng.int(15, 50)) : at(day, 8 * 60 + 15 * rng.int(0, 38)))
      }
    }

    const own = prescriptionFulfillments.filter((f) => items.some((i) => i.id === f.prescription_item_id))
    if (own.length) {
      rx.locked_at = own.map((f) => f.fulfilled_at).sort()[0]
      log({ at: rx.locked_at, actor_type: 'system', actor_id: null, action: 'update', entity_type: 'prescription', entity_id: rx.id, patient_id: rx.patient_id, description: 'Payment recorded, the care plan is locked' })
    }
    if (clinicItems.length && clinicItems.every((i) => own.some((f) => f.prescription_item_id === i.id))) rx.status = 'completed'
  }

  // ============ 5. Uploaded files: lab results, reports brought in, scan images ============

  const files: FileRecord[] = []
  const crmOf = (patientId: string) => patients.find((p) => p.id === patientId)!.crm_client_id
  const compact = (iso: string) => iso.slice(0, 10).replaceAll('-', '')

  const upload = (input: {
    patientId: string; folderId: string; title: string; date: string; created: string; authorId: string
    files: { name: string; mime: string; url: string }[]
  }) => {
    const doc: MedDocument = {
      id: `d-${documents.length + 1}`, patient_id: input.patientId, kind: 'upload', template_version_id: null,
      folder_id: input.folderId, title: input.title, number: null, document_date: input.date, values: null,
      author_id: input.authorId, created_at: input.created, updated_at: input.created,
    }
    documents.push(doc)
    for (const f of input.files) {
      files.push({
        id: `fl-${files.length + 1}`, document_id: doc.id, patient_id: input.patientId, file_name: f.name, mime_type: f.mime,
        size_bytes: f.mime === 'application/pdf' ? rng.int(118, 264) * 1000 : rng.int(320, 520) * 1000, url: f.url, created_at: input.created,
      })
    }
    log({
      at: input.created, actor_id: input.authorId, action: 'create', entity_type: 'document', entity_id: doc.id, patient_id: input.patientId,
      description: `Uploaded «${input.title}», ${input.files.length === 1 ? '1 file' : `${input.files.length} files`}`,
    })
  }
  const pdf = (name: string) => ({ name, mime: 'application/pdf', url: '/samples/sample.pdf' })
  const uploaderPool = [FRONT_DESK_ID, FRONT_DESK_ID, FRONT_DESK_ID, ...NURSE_IDS]

  for (const plan of plans) {
    const byLab = new Map<string, string[]>()
    for (const item of plan.items) {
      const svc = item.service_id ? SERVICES.find((s) => s.id === item.service_id)! : null
      if (!svc || svc.category !== 'lab') continue
      const f = prescriptionFulfillments.find((x) => x.prescription_item_id === item.id)
      if (!f) continue
      const lab = svc.lab_name ?? 'clinic'
      byLab.set(lab, [...(byLab.get(lab) ?? []), f.fulfilled_at])
    }
    for (const [lab, dates] of byLab) {
      if (lab === 'clinic' && !rng.chance(0.4)) continue
      const taken = dates.sort()[dates.length - 1]
      const ready = addDays(taken.slice(0, 10), lab === 'clinic' ? 1 : rng.int(2, 4))
      if (ready >= today || weekday(ready) === 0) continue
      const folder = lab === 'Northlab' ? 'f-4' : lab === 'CityLab' ? 'f-5' : 'f-3'
      const title = lab === 'clinic' ? 'Clinic lab results' : `${lab} results`
      upload({
        patientId: plan.patient.id, folderId: folder, title, date: taken.slice(0, 10), created: at(ready, 9 * 60 + 15 * rng.int(0, 28)),
        authorId: rng.pick(uploaderPool), files: [pdf(`${lab.toLowerCase()}_${plan.patient.crm_client_id}_${compact(taken)}.pdf`)],
      })
    }
    // External tests the patient did elsewhere and brought the report.
    for (const item of plan.items.filter((i) => i.custom_name)) {
      if (!rng.chance(0.4)) continue
      const day = addDays(plan.rx.created_at.slice(0, 10), rng.int(7, 25))
      if (day >= today || weekday(day) === 0) continue
      const name = item.custom_name!
      const endoscopy = /endoscopy|gastroscopy|colonoscopy/i.test(name)
      const title = endoscopy
        ? /colonoscopy/i.test(name) ? 'Colonoscopy report' : 'Gastroscopy report'
        : /consultation/i.test(name) ? `${name} letter` : `${name.replace(/\s*\(.*\)$/, '')} report`
      upload({
        patientId: plan.patient.id, folderId: endoscopy ? 'f-7' : 'f-9', title, date: addDays(day, -rng.int(1, 4)),
        created: at(day, 10 * 60 + 15 * rng.int(0, 24)), authorId: FRONT_DESK_ID,
        files: [pdf(`${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${plan.patient.crm_client_id}.pdf`)],
      })
    }
  }
  for (const doc of documents.filter((d) => d.kind === 'template' && d.author_id === US_ID && d.document_date < today)) {
    if (!rng.chance(0.45)) continue
    const base = `us_${crmOf(doc.patient_id)}_${compact(doc.document_date)}`
    upload({
      patientId: doc.patient_id, folderId: 'f-6', title: 'Ultrasound images', date: doc.document_date, created: addMinutes(doc.created_at, 3),
      authorId: US_ID, files: [1, 2].map((n) => ({ name: `${base}_${n}.jpg`, mime: 'image/jpeg', url: '/samples/sample.jpg' })),
    })
  }
  for (const patient of patients) {
    if (!rng.chance(0.15)) continue
    const day = addDays(today, -rng.int(20, HISTORY_DAYS))
    if (weekday(day) === 0) continue
    upload({
      patientId: patient.id, folderId: 'f-9', title: rng.pick(['Hospital discharge summary', 'Previous medical records', 'Vaccination record']),
      date: day, created: at(day, 11 * 60 + 15 * rng.int(0, 20)), authorId: FRONT_DESK_ID, files: [pdf(`records_${patient.crm_client_id}.pdf`)],
    })
  }

  // ============ 6. Today's CRM schedule: doctors, and nurses taking blood after the visits ============

  const crmVisits: CrmVisit[] = []
  const masterOf = new Map(staff.map((s) => [s.id, s.crm_master_id]))
  for (const v of todayVisits.sort((a, b) => a.minutes - b.minutes)) {
    crmVisits.push({
      crm_visit_id: 900_001 + crmVisits.length, crm_client_id: v.patient.crm_client_id, crm_master_id: masterOf.get(v.doctorId)!,
      visit_at: at(today, v.minutes), status: v.done ? 'completed' : rng.chance(0.85) ? 'confirmed' : 'new',
    })
  }
  const todaysPlans = plans.filter((p) => ageDays(p) === 0 && p.items.some((i) => i.section === 'lab'))
  const recentPlans = plans.filter((p) => ageDays(p) > 0 && ageDays(p) <= 6 && p.items.some((i) => i.section === 'lab' && !prescriptionFulfillments.some((f) => f.prescription_item_id === i.id)))
  const nurseQueue = [...todaysPlans, ...rng.shuffle(recentPlans)]
  const nurseVisitCount = [5, 4]
  const nurseSeen = new Set<string>()
  NURSE_IDS.forEach((nurseId, n) => {
    let minutes = 8 * 60 + 15 * n
    for (let k = 0; k < nurseVisitCount[n]; k++) {
      const plan = nurseQueue.find((p) => !nurseSeen.has(p.patient.id))
      if (!plan) break
      nurseSeen.add(plan.patient.id)
      const after = ageDays(plan) === 0 ? Math.ceil((minutesOf(plan.rx.created_at) + 10) / 5) * 5 : minutes
      minutes = Math.max(minutes, after)
      crmVisits.push({
        crm_visit_id: 900_001 + crmVisits.length, crm_client_id: plan.patient.crm_client_id, crm_master_id: masterOf.get(nurseId)!,
        visit_at: at(today, minutes), status: 'confirmed',
      })
      minutes += 20 + 10 * rng.int(0, 2)
    }
  })

  // ============ 7. Activity log: template versions, then everything above in time order ============

  for (const version of templates.versions) {
    const template = templates.templates.find((t) => t.id === version.template_id)!
    log({
      at: version.created_at, actor_id: MANAGER_ID, action: version.version === 1 ? 'create' : 'update', entity_type: 'template_version',
      entity_id: version.id, patient_id: null, description: `Saved version ${version.version} of template «${template.name}»`,
    })
  }
  const auditLog: AuditEntry[] = audit
    .map((entry, i) => ({ entry, i }))
    .sort((a, b) => a.entry.at.localeCompare(b.entry.at) || a.i - b.i)
    .map(({ entry }, i) => ({ id: i + 1, ...entry }))

  return {
    staff,
    currentUserId: MANAGER_ID,
    patients,
    services: SERVICES.map((s) => ({ ...s })),
    servicePackages: BUNDLES.map((b) => ({ ...b, items: b.items.map((i) => ({ ...i })) })),
    folders: FOLDERS.map((f) => ({ ...f })),
    templates: templates.templates,
    templateVersions: templates.versions,
    documents,
    files,
    prescriptions,
    prescriptionItems,
    prescriptionFulfillments,
    crmVisits,
    clinicSettings: { ...CLINIC_SETTINGS },
    letterheads: LETTERHEADS.map((l) => ({ ...l })),
    auditLog,
  }
}

// ============ Filling a template from a scenario ============

type Selection = { serviceId?: string; customName?: string; category: PrescriptionItem['section'] }

const MEDICAL_HISTORY = ['No chronic conditions.', 'Appendicectomy in childhood.', 'Seasonal hay fever.', 'Asthma in childhood, no symptoms now.']
const ALLERGIES = ['penicillin — rash', 'NSAIDs — urticaria', 'house dust mite — rhinitis', 'latex — contact dermatitis']

function buildNote(rng: Rng, visit: Visit, schema: TemplateSchema) {
  const { scenario, patient } = visit
  const chosenCase = visit.caseIndex === null ? undefined : scenario.cases![visit.caseIndex]
  const long: CaseText = visit.long ? (scenario.long ?? {}) : {}
  const content: CaseText = { ...scenario, ...chosenCase, ...long }
  const extra: Record<string, Value> = { ...scenario.extra, ...chosenCase?.extra, ...long.extra }
  const age = patient.birth_date ? daysBetween(patient.birth_date, visit.date) / 365.25 : 41
  const child = age < 12
  const sex = patient.sex ?? 'female'
  const ctx: ValueContext = { rng, date: visit.date, age, sex }
  const duration = rng.pick(scenario.durations ?? DEFAULT_DURATIONS)
  const years = rng.int(2, 12)
  const say = (text: Text | undefined) => {
    if (text === undefined) return undefined
    const chosen = typeof text === 'string' ? text : rng.pick(text)
    return chosen ? chosen.replace(/\{d\}/g, duration).replace(/\{years\}/g, String(years)) : undefined
  }
  const range = (r: readonly [number, number] | undefined, fallback: [number, number], digits = 0) =>
    rng.float((r ?? fallback)[0], (r ?? fallback)[1], digits)
  const vitals = scenario.vitals ?? {}

  const generic: Record<string, () => FieldValue | undefined> = {
    complaints: () => say(content.complaints),
    disease_history: () => say(content.history),
    prev_treatment: () => {
      const treatment = say(content.prevTreatment)
      return treatment === 'None.' ? undefined : treatment
    },
    medical_history: () => say(content.medicalHistory) ?? (child ? 'Vaccinations up to date.' : rng.chance(0.35) ? rng.pick(MEDICAL_HISTORY) : undefined),
    allergies: () => (rng.chance(scenario.allergyChance ?? 0.15) ? rng.pick(ALLERGIES) : 'none known'),
    habits: () => {
      if (child) return undefined
      const h = scenario.habits ?? { smoking: 0.18, alcohol: 0.3 }
      const list = (['smoking', 'alcohol', 'vaping'] as const).filter((k) => rng.chance(h[k] ?? 0))
      return list.length ? [...list] : undefined
    },
    general_state: () => say(scenario.generalState) ?? 'good',
    bp: () => (child ? undefined : `${range(vitals.bp?.[0], [112, 132])}/${range(vitals.bp?.[1], [70, 84])}`),
    hr: () => (child ? rng.int(92, 116) : range(vitals.hr, [62, 80])),
    temp: () => range(vitals.temp, [36.4, 36.8], 1),
    spo2: () => range(vitals.spo2, [97, 99]),
    weight: () => (child ? Math.round(age * 2.6 + 9) : sex === 'male' ? rng.int(72, 98) : rng.int(56, 84)),
    height: () => (child ? undefined : sex === 'male' ? rng.int(168, 188) : rng.int(156, 172)),
    exam_notes: () => say(content.examNotes),
    diagnosis: () => say(content.diagnosis),
    us_conclusion: () => say(content.diagnosis),
    // Not every note has lifestyle advice; the long ones always do.
    rec_lifestyle: () => (visit.long || rng.chance(0.7) ? say(content.lifestyle) : undefined),
    // «None.» would only take two lines on the sheet.
    rec_drugs: () => {
      const drugs = say(content.drugs)
      return drugs === 'None.' ? undefined : drugs
    },
    rec_followup: () => say(content.followUp),
  }

  const values: DocumentValues = {}
  for (const field of schemaFields(schema)) {
    let value: FieldValue | undefined
    if (field.id in extra) {
      const v = extra[field.id]
      value = typeof v === 'function' ? v(ctx) : v
    } else if (generic[field.id]) {
      value = generic[field.id]()
    } else if (field.defaultValue !== undefined && field.type !== 'checkbox') {
      value = field.defaultValue
    }
    if (value !== undefined && value !== '') values[field.id] = value
  }
  // Services: always + maybe, by category into the template's services fields.
  const pick = (sp: ServicePick | undefined) => [
    ...(sp?.always ?? []),
    ...(sp?.maybe ?? []).filter(([, p]) => rng.chance(p)).map(([code]) => code),
  ]
  const caseServices = chosenCase as { lab?: ServicePick; instrumental?: ServicePick; consultation?: ServicePick } | undefined
  const codes = [
    ...pick(caseServices?.lab ?? scenario.lab),
    ...pick(caseServices?.instrumental ?? scenario.instrumental),
    ...pick(caseServices?.consultation ?? scenario.consultation),
  ]
  const blocks = serviceBlocks(schema)
  const clinic = [...new Set(codes)].map(service).filter((s) => blocks.some((b) => b.category === s.category))
  // External items only go with clinic services: a plan with nothing priced would sit at 0% for ever.
  const externals = clinic.length
    ? (['instrumental', 'consultation'] as const).flatMap((category) =>
        (scenario.external?.[category] ?? []).filter(([, p]) => rng.chance(p)).map(([name]) => ({ name, category })),
      )
    : []
  const freeText = schemaFields(schema).some((f) => f.id === 'rec_external')

  const selections: Selection[] = []
  for (const block of blocks) {
    const chosen: ServiceSelection[] = clinic
      .filter((s) => s.category === block.category)
      .map((s) => ({ serviceId: s.id, quantity: 1 }))
    if (!freeText) chosen.push(...externals.filter((e) => e.category === block.category).map((e) => ({ customName: e.name, quantity: 1 })))
    if (chosen.length) values[block.id] = chosen
    for (const sel of chosen) {
      selections.push(sel.serviceId !== undefined ? { serviceId: sel.serviceId, category: block.category } : { customName: sel.customName, category: block.category })
    }
  }
  const externalText = freeText && externals.length ? externals.map((e) => e.name).join('; ') : null
  if (externalText) values.rec_external = externalText

  return { values, selections, externalText }
}
