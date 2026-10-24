// Document templates of the demo clinic and their versions. Each version is a full schema; documents point to the
// version that was current on their date, so old notes keep their old structure (e.g. the free-text External field).
import type { Block, FieldBlock, GroupBlock, Section, Template, TemplateKind, TemplateSchema, TemplateVersion } from '../types'
import { addDays, at } from './random'

// ---- Field builders

type FieldExtra = Partial<Pick<FieldBlock, 'unit' | 'options' | 'defaultValue' | 'required'>>

const field = (type: FieldBlock['type']) => (id: string, label: string, description: string, extra: FieldExtra = {}): FieldBlock => ({
  kind: 'field', id, type, label, description, ...extra,
})
const text = field('text')
const textarea = field('textarea')
const number = field('number')
const select = (id: string, label: string, description: string, options: string[], extra: FieldExtra = {}) =>
  field('select')(id, label, description, { options, defaultValue: options[0], ...extra })
const multiselect = (id: string, label: string, description: string, options: string[]) =>
  field('multiselect')(id, label, description, { options })
const checkbox = (id: string, label: string, description: string) =>
  field('checkbox')(id, label, description, { defaultValue: false })
const group = (id: string, title: string, blocks: FieldBlock[]): GroupBlock => ({ kind: 'group', id, title, blocks })
const section = (id: string, title: string, blocks: Block[]): Section => ({ id, title, blocks })

// ---- Shared pieces

const bp = text('bp', 'BP', 'Blood pressure', { unit: 'mmHg' })
const hr = number('hr', 'Heart rate', 'Heart rate at rest', { unit: 'bpm' })
const temp = number('temp', 'Temperature', 'Body temperature', { unit: '°C' })
const spo2 = number('spo2', 'SpO₂', 'Oxygen saturation at rest', { unit: '%' })
const weight = number('weight', 'Weight', 'Body weight', { unit: 'kg' })
const height = number('height', 'Height', 'Height', { unit: 'cm' })
const waist = number('waist', 'Waist', 'Waist circumference at the navel', { unit: 'cm' })

const generalState = select('general_state', 'General condition', 'Overall assessment of the patient', [
  'good', 'satisfactory', 'moderately impaired', 'poor',
])
const allergies = text('allergies', 'Allergies', 'Allergen and reaction, e.g. penicillin — rash', { defaultValue: 'none known' })
// Unnamed: the findings follow the vitals line directly, without a label line of their own.
const examNotes = textarea('exam_notes', '', 'Other examination findings')

const complaints = () =>
  section('sec_complaints', 'Complaints', [
    textarea('complaints', '', 'All the symptoms the patient reports, starting with the main reason for the visit'),
  ])

const diseaseHistory = textarea('disease_history', '', 'When it started, how it has progressed, how long it has lasted')
const prevTreatment = (label = 'Previous treatment') =>
  text('prev_treatment', label, 'Medicines, doses and duration, self-prescribed or prescribed')
const medicalHistory = text('medical_history', 'Past medical history', 'Chronic conditions, operations, hospital stays')

// The only field, labelled like its section: the sheet prints the text right under the bar (AGENTS.md → section bars).
const assessment = () =>
  section('sec_assessment', 'Assessment', [
    textarea('diagnosis', 'Assessment', 'Main and secondary diagnoses', { required: true }),
  ])

// The services fields feed the care plan, so their ids are fixed (builder-utils → RECOMMENDATION_IDS).
const recommendations = ({ external = false, lifestyle = true, followUp = true } = {}) =>
  section('sec_recommendations', 'Recommendations', [
    { kind: 'services', id: 'rec_lab', label: 'Lab tests', category: 'lab' },
    { kind: 'services', id: 'rec_instrumental', label: 'Instrumental diagnostics', category: 'instrumental' },
    { kind: 'services', id: 'rec_consultation', label: 'Specialist consultations', category: 'consultation' },
    ...(external
      ? [text('rec_external', 'Recommended External services', 'Tests and referrals not available at the clinic')]
      : []),
    ...(lifestyle
      ? [
          text('rec_lifestyle', 'Lifestyle', 'Diet, routine, physical activity'),
          textarea('rec_drugs', 'Medication', 'Drugs, doses, duration'),
        ]
      : []),
    ...(followUp ? [text('rec_followup', 'Follow-up', 'When and why to come back')] : []),
  ])

// ---- Schemas

function generalSchema(version: 1 | 2 | 3): TemplateSchema {
  return {
    sections: [
      complaints(),
      section('sec_history', 'History', [
        diseaseHistory, prevTreatment(), medicalHistory,
        group('allergies_habits', 'Allergies and habits', [
          allergies,
          multiselect('habits', 'Habits', 'Smoking, alcohol, vaping', ['smoking', 'alcohol', 'vaping']),
        ]),
      ]),
      section('sec_exam', 'Examination', [
        generalState,
        group('vitals', 'Vitals', version === 3 ? [bp, hr, temp, spo2, weight] : [bp, hr, temp]),
        examNotes,
      ]),
      assessment(),
      // v1 kept External services as free text; from v2 they are chips in the services fields.
      recommendations({ external: version === 1, followUp: version === 3 }),
    ],
  }
}

function endoSchema(version: 1 | 2): TemplateSchema {
  return {
    sections: [
      complaints(),
      section('sec_history', 'History', [
        diseaseHistory,
        prevTreatment('Current treatment'),
        ...(version === 2 ? [text('family_history', 'Family history', 'Diabetes, thyroid and other endocrine disease in relatives')] : []),
        medicalHistory, allergies,
      ]),
      section('sec_exam', 'Examination', [
        generalState,
        group('vitals', 'Vitals', version === 2 ? [bp, hr, weight, height, waist] : [bp, hr, weight, height]),
        select('thyroid_palpation', 'Thyroid on palpation', 'Size, consistency, nodules', ['not enlarged', 'diffusely enlarged', 'nodular']),
        examNotes,
      ]),
      assessment(),
      recommendations(),
    ],
  }
}

function cardioSchema(): TemplateSchema {
  return {
    sections: [
      complaints(),
      section('sec_history', 'History', [
        diseaseHistory, prevTreatment('Current treatment'), medicalHistory,
        multiselect('risk_factors', 'Risk factors', 'Cardiovascular risk factors', [
          'hypertension', 'diabetes', 'dyslipidaemia', 'smoking', 'family history', 'obesity',
        ]),
        allergies,
      ]),
      section('sec_exam', 'Examination', [
        generalState,
        group('vitals', 'Vitals', [bp, hr, spo2, weight]),
        group('cardiac', 'Heart', [
          select('heart_sounds', 'Heart sounds', 'Rhythm and murmurs on auscultation', [
            'regular, no murmurs', 'irregular', 'systolic murmur', 'diastolic murmur',
          ]),
          select('oedema', 'Peripheral oedema', 'Pitting oedema of the legs', ['none', 'ankles', 'lower legs']),
        ]),
        examNotes,
        text('ecg', 'ECG', 'Rhythm, rate, axis, intervals, ST–T changes'),
        select('cv_risk', 'Cardiovascular risk', 'Ten-year risk category', ['low', 'moderate', 'high', 'very high'], { defaultValue: undefined }),
      ]),
      assessment(),
      recommendations(),
    ],
  }
}

function gynSchema(): TemplateSchema {
  return {
    sections: [
      complaints(),
      section('sec_history', 'History', [
        diseaseHistory,
        group('menstrual', 'Menstrual history', [
          text('lmp', 'Last period', 'First day of the last menstrual period'),
          text('cycle', 'Cycle', 'Length and regularity'),
          select('contraception', 'Contraception', 'Current method', ['none', 'combined pill', 'IUD', 'condoms', 'other']),
        ]),
        text('obstetric', 'Pregnancies and births', 'Number, year, mode of delivery'),
        medicalHistory, allergies,
      ]),
      section('sec_exam', 'Examination', [
        generalState,
        group('vitals', 'Vitals', [bp, hr, weight]),
        select('breasts', 'Breasts', 'Breast examination', ['no abnormalities', 'changes found']),
        text('speculum', 'Speculum examination', 'Cervix, discharge, samples taken'),
        text('bimanual', 'Bimanual examination', 'Uterus size and position, adnexa, tenderness'),
      ]),
      assessment(),
      recommendations(),
    ],
  }
}

function neuroSchema(): TemplateSchema {
  return {
    sections: [
      complaints(),
      section('sec_history', 'History', [diseaseHistory, prevTreatment(), medicalHistory, allergies]),
      section('sec_exam', 'Neurological examination', [
        generalState,
        group('vitals', 'Vitals', [bp, hr]),
        group('neuro_status', 'Neurological status', [
          select('cranial_nerves', 'Cranial nerves', 'Cranial nerves I–XII', ['intact', 'abnormal']),
          select('reflexes', 'Reflexes', 'Deep tendon reflexes', ['normal, symmetrical', 'brisk', 'reduced', 'asymmetrical']),
          select('sensation', 'Sensation', 'Light touch, pinprick, vibration', ['intact', 'reduced', 'increased']),
          select('coordination', 'Coordination', 'Finger–nose, heel–shin, Romberg', ['normal', 'impaired']),
        ]),
        text('motor', 'Motor system', 'Tone, power (0–5), involuntary movements'),
        checkbox('meningeal', 'Meningeal signs', 'Neck stiffness, Kernig, Brudzinski'),
        text('spine', 'Spine', 'Posture, range of movement, tenderness, tension signs'),
        examNotes,
      ]),
      assessment(),
      recommendations(),
    ],
  }
}

function usThyroidSchema(version: 1 | 2): TemplateSchema {
  return {
    sections: [
      section('sec_thyroid', 'Thyroid gland', [
        select('thyroid_contour', 'Contour', 'Outline of the gland', ['clear, smooth', 'clear, uneven', 'blurred']),
        select('thyroid_echogenicity', 'Echogenicity', 'Echogenicity of the parenchyma', ['normal', 'reduced', 'increased', 'mixed']),
        select('thyroid_structure', 'Structure', 'Structure of the parenchyma', ['homogeneous', 'heterogeneous', 'finely granular', 'with nodules']),
        ...(version === 2 ? [select('thyroid_vascularity', 'Blood flow', 'Colour Doppler', ['normal', 'increased', 'reduced'])] : []),
      ]),
      section('sec_thyroid_sizes', 'Measurements', [
        group('thyroid_sizes', 'Lobe volumes', [
          number('vol_right', 'Right lobe', 'Volume of the right lobe', { unit: 'ml' }),
          number('vol_left', 'Left lobe', 'Volume of the left lobe', { unit: 'ml' }),
          number('isthmus', 'Isthmus', 'Thickness of the isthmus', { unit: 'mm' }),
          number('vol_total', 'Total volume', 'Total thyroid volume', { unit: 'ml' }),
        ]),
      ]),
      section('sec_nodules', version === 2 ? 'Nodules and lymph nodes' : 'Nodules', [
        textarea('nodules', '', 'Location, size, echo structure, TI-RADS category'),
        ...(version === 2 ? [select('lymph_nodes', 'Neck lymph nodes', 'Regional lymph nodes', ['not enlarged', 'enlarged'])] : []),
      ]),
      section('sec_us_conclusion', 'Conclusion', [
        textarea('us_conclusion', 'Conclusion', 'Ultrasound conclusion: normal or the changes found', { required: true }),
      ]),
      recommendations({ lifestyle: false, followUp: false }),
    ],
  }
}

function usAbdoSchema(): TemplateSchema {
  return {
    sections: [
      section('sec_liver', 'Liver', [
        group('liver_size', 'Size', [
          number('liver_right', 'Right lobe', 'Craniocaudal size of the right lobe', { unit: 'mm' }),
          number('liver_left', 'Left lobe', 'Size of the left lobe', { unit: 'mm' }),
          number('portal_vein', 'Portal vein', 'Diameter of the portal vein', { unit: 'mm' }),
        ]),
        select('liver_echo', 'Echogenicity', 'Echogenicity of the liver', ['normal', 'increased', 'reduced']),
        select('liver_structure', 'Structure', 'Structure of the parenchyma', ['homogeneous', 'heterogeneous']),
      ]),
      section('sec_gallbladder', 'Gallbladder and bile ducts', [
        select('gallbladder', 'Gallbladder', 'Contents of the gallbladder', ['normal', 'stones', 'polyp', 'sludge', 'removed']),
        number('gb_wall', 'Wall thickness', 'Gallbladder wall', { unit: 'mm' }),
        number('cbd', 'Common bile duct', 'Diameter of the common bile duct', { unit: 'mm' }),
        textarea('gb_notes', '', 'Stones: number, size, mobility; polyps'),
      ]),
      section('sec_pancreas', 'Pancreas and spleen', [
        select('pancreas', 'Pancreas', 'Size and echogenicity', ['no changes', 'increased echogenicity', 'not well seen']),
        number('spleen', 'Spleen length', 'Length of the spleen', { unit: 'mm' }),
      ]),
      section('sec_kidneys', 'Kidneys', [
        text('kidney_right', 'Right kidney', 'Size, parenchyma, collecting system'),
        text('kidney_left', 'Left kidney', 'Size, parenchyma, collecting system'),
        checkbox('free_fluid', 'Free fluid in the abdomen', 'Free fluid seen'),
      ]),
      section('sec_us_conclusion', 'Conclusion', [
        textarea('us_conclusion', 'Conclusion', 'Ultrasound conclusion: normal or the changes found', { required: true }),
      ]),
      recommendations({ lifestyle: false, followUp: false }),
    ],
  }
}

function certificateSchema(): TemplateSchema {
  return {
    sections: [
      section('sec_certificate', 'Certificate', [
        {
          kind: 'static', id: 'cert_intro',
          text: 'This is to certify that {patient.full_name}, date of birth {patient.birth_date}, was examined at the clinic on {document.date}.',
        },
        text('purpose', 'Issued for', 'Where the certificate is to be presented', { defaultValue: 'Presentation to the employer' }),
        text('occupation', 'Occupation', 'Job title and type of work'),
      ]),
      section('sec_fitness', 'Conclusion', [
        select('fitness', 'Fitness to work', 'Conclusion of the examination', ['fit for work', 'fit with restrictions', 'temporarily unfit'], { required: true }),
        textarea('restrictions', 'Restrictions', 'Work restrictions, if any'),
        text('valid_until', 'Valid until', 'Date the certificate expires'),
      ]),
    ],
  }
}

// ---- Templates

export type TemplateKey = 'general' | 'endo' | 'cardio' | 'gyn' | 'neuro' | 'usThyroid' | 'usAbdo' | 'certificate'

type TemplateDef = {
  key: TemplateKey
  name: string
  kind: TemplateKind
  folder_id: string
  specialty: string
  package_ids: string[]
  footer_text?: string
  /** Versions from the oldest: how many days before today each was saved, and its schema. */
  versions: [daysAgo: number, schema: TemplateSchema][]
}

const consultation = { kind: 'consultation' as const, folder_id: 'f-1' }
const ultrasound = { kind: 'ultrasound' as const, folder_id: 'f-6', specialty: 'Ultrasound doctor' }

const DEFS: TemplateDef[] = [
  {
    key: 'general', name: 'General consultation note', ...consultation, specialty: 'General practitioner',
    package_ids: ['pk-annual', 'pk-presurgery', 'pk-cardio'],
    versions: [[210, generalSchema(1)], [125, generalSchema(2)], [42, generalSchema(3)]],
  },
  {
    key: 'endo', name: 'Endocrinology consultation note', ...consultation, specialty: 'Endocrinologist',
    package_ids: ['pk-thyroid', 'pk-diabetes'],
    versions: [[200, endoSchema(1)], [75, endoSchema(2)]],
  },
  {
    key: 'cardio', name: 'Cardiology consultation note', ...consultation, specialty: 'Cardiologist',
    package_ids: ['pk-cardio', 'pk-presurgery'], versions: [[190, cardioSchema()]],
  },
  {
    key: 'gyn', name: 'Gynaecology consultation note', ...consultation, specialty: 'Gynaecologist',
    package_ids: ['pk-women'], versions: [[185, gynSchema()]],
  },
  {
    key: 'neuro', name: 'Neurology consultation note', ...consultation, specialty: 'Neurologist',
    package_ids: [], versions: [[185, neuroSchema()]],
  },
  {
    key: 'usThyroid', name: 'Thyroid ultrasound', ...ultrasound, package_ids: ['pk-thyroid'],
    footer_text: 'Scanned with a high-frequency linear probe (7–12 MHz).',
    versions: [[195, usThyroidSchema(1)], [100, usThyroidSchema(2)]],
  },
  {
    key: 'usAbdo', name: 'Abdominal ultrasound', ...ultrasound, package_ids: [],
    footer_text: 'Scanned with a convex probe (2–5 MHz) after an overnight fast.',
    versions: [[195, usAbdoSchema()]],
  },
  {
    key: 'certificate', name: 'Fitness to work certificate', kind: 'certificate', folder_id: 'f-8',
    specialty: 'General practitioner', package_ids: [], versions: [[200, certificateSchema()]],
  },
]

export type DemoTemplates = {
  templates: Template[]
  versions: TemplateVersion[]
  /** The template of a key. */
  template: (key: TemplateKey) => Template
  /** The version that was current on `dateIso`. */
  versionOn: (key: TemplateKey, dateIso: string) => TemplateVersion
}

export function buildTemplates(today: string): DemoTemplates {
  const templates: Template[] = []
  const versions: TemplateVersion[] = []
  const byKey = new Map<TemplateKey, { template: Template; versions: TemplateVersion[] }>()

  for (const def of DEFS) {
    const id = `tpl-${def.key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`
    const own = def.versions.map(([daysAgo, schema], i): TemplateVersion => ({
      id: `tv-${id.slice(4)}-${i + 1}`,
      template_id: id,
      version: i + 1,
      schema,
      created_at: at(addDays(today, -daysAgo), 18 * 60 + 5 * i),
    }))
    const template: Template = {
      id, name: def.name, kind: def.kind, folder_id: def.folder_id, specialty: def.specialty,
      current_version_id: own[own.length - 1].id, is_active: true,
      header_id: 'lh-records',
      // The general note ends with the signature-and-booking footer image; the others print a signature line.
      footer_id: def.key === 'general' ? 'lh-signature' : null,
      footer_text: def.footer_text ?? null,
      show_signature: def.key !== 'general',
      banner_image_url: null, footer_image_url: null,
      package_ids: def.package_ids,
    }
    templates.push(template)
    versions.push(...own)
    byKey.set(def.key, { template, versions: own })
  }

  return {
    templates,
    versions,
    template: (key) => byKey.get(key)!.template,
    versionOn: (key, dateIso) => {
      const own = byKey.get(key)!.versions
      return [...own].reverse().find((v) => v.created_at.slice(0, 10) <= dateIso) ?? own[0]
    },
  }
}
