import { calcAge } from '@/lib/data'
import type {
  DocumentValues,
  FieldBlock,
  FieldValue,
  Patient,
  Service,
  ServiceSelection,
  ServicesBlock,
  Staff,
  TemplateSchema,
  TemplateVariable,
} from '@/lib/types'
import { formatNumber, formatSheetDate } from '@/lib/format'

export type TemplateFormContext = {
  patient: Patient
  doctor: Staff
  documentDate: string
  documentNumber: string | null
}

export const sectionElementId = (sectionId: string) => `tf-section-${sectionId}`
export const fieldElementId = (fieldId: string) => `tf-field-${fieldId}`
export const cleanLabel = (label: string) => label.trim().replace(/:\s*$/, '')

/** Variables land on the sheet, so dates take the sheet format (10/24/2026). */
function formatIsoDate(iso: string | null) {
  return iso ? formatSheetDate(iso.slice(0, 10)) : ''
}

export function collectFields(schema: TemplateSchema): FieldBlock[] {
  return schema.sections.flatMap((section) =>
    section.blocks.flatMap((block) => {
      if (block.kind === 'field') return [block]
      if (block.kind === 'group') return block.blocks.filter((b) => b.kind === 'field')
      return []
    }),
  )
}

export function collectServiceBlocks(schema: TemplateSchema): ServicesBlock[] {
  return schema.sections.flatMap((s) => s.blocks).filter((b): b is ServicesBlock => b.kind === 'services')
}

/** Defaults of text fields may contain variables; they are resolved once, when the document is created. */
export function getInitialValues(schema: TemplateSchema, context?: TemplateFormContext): DocumentValues {
  const values: DocumentValues = {}
  for (const field of collectFields(schema)) {
    const value = field.defaultValue
    if (value === undefined) continue
    if (Array.isArray(value)) values[field.id] = [...value]
    else if (typeof value === 'string' && context) values[field.id] = interpolate(value, context)
    else values[field.id] = value
  }
  return values
}

export function isEmptyValue(value: FieldValue | undefined): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (typeof value === 'number') return Number.isNaN(value)
  if (typeof value === 'boolean') return !value
  return value.length === 0
}

/** How a field is named in messages and for screen readers: its label, or «field in section «…»» — the name is
 *  optional (the sheet then prints only the value). Keyed by field id. */
export function fieldNames(schema: TemplateSchema): Map<string, string> {
  const names = new Map<string, string>()
  for (const section of schema.sections) {
    const fields = section.blocks.flatMap((b) => (b.kind === 'field' ? [b] : b.kind === 'group' ? b.blocks : []))
    for (const field of fields) {
      names.set(field.id, cleanLabel(field.label) || `field in section «${cleanLabel(section.title)}»`)
    }
  }
  return names
}

export function findMissingRequired(schema: TemplateSchema, values: DocumentValues): string[] {
  return collectFields(schema)
    .filter((field) => field.required && isEmptyValue(values[field.id]))
    .map((field) => field.id)
}

/** Said only in the dropdown item that adds an External service; after that it is a plain service name. */
export const OUTSIDE_CLINIC_LABEL = 'External'

/** A catalog service (serviceId) or one outside the clinic (customName) — exactly one of the two. */
function isServiceSelection(value: unknown): value is ServiceSelection {
  if (typeof value !== 'object' || value === null) return false
  const { serviceId, customName } = value as { serviceId?: unknown; customName?: unknown }
  if (typeof serviceId === 'string') return customName === undefined
  return typeof customName === 'string' && customName.trim() !== ''
}

export function asServiceSelections(value: FieldValue | undefined): ServiceSelection[] {
  return Array.isArray(value) ? (value as unknown[]).filter(isServiceSelection) : []
}

/** Same service, same key: a catalog id, or the outside-clinic name ignoring case. */
export function selectionKey(selection: ServiceSelection): string {
  return selection.customName !== undefined ? `custom:${selection.customName.trim().toLowerCase()}` : selection.serviceId
}

/** «Name ×2», a service outside the clinic by the name it was typed with (no mark). Null while a catalog service
 *  is not resolved yet. */
export function selectionText(selection: ServiceSelection, byId: Map<string, Service>): string | null {
  const name = selection.customName ?? byId.get(selection.serviceId)?.name ?? null
  if (name === null) return null
  return selection.quantity > 1 ? `${name} ×${selection.quantity}` : name
}

/** Every selection in every services field: catalog services and those outside the clinic. */
export function getSelectedServices(schema: TemplateSchema, values: DocumentValues): ServiceSelection[] {
  return collectServiceBlocks(schema).flatMap((block) => asServiceSelections(values[block.id]))
}

export function formatFieldValue(field: FieldBlock, value: FieldValue | undefined): string | null {
  if (value === undefined || value === null) return null
  const withUnit = (text: string) => (field.unit ? `${text} ${field.unit}` : text)

  switch (field.type) {
    case 'checkbox':
      return value === true ? 'Yes' : value === false ? 'No' : null
    case 'multiselect':
      return Array.isArray(value) && value.length ? (value as string[]).join(', ') : null
    case 'number': {
      if (value === '') return null
      const num = typeof value === 'number' ? value : Number(value)
      return Number.isNaN(num) ? null : withUnit(formatNumber(num))
    }
    default: {
      const text = String(value).trim()
      return text ? withUnit(text) : null
    }
  }
}

export function interpolate(text: string, context: TemplateFormContext): string {
  const age = calcAge(context.patient.birth_date)
  const variables: Record<TemplateVariable, string> = {
    'patient.full_name': context.patient.full_name,
    'patient.age': age === null ? '' : String(age),
    'patient.birth_date': formatIsoDate(context.patient.birth_date),
    'patient.crm_client_id': String(context.patient.crm_client_id),
    'document.date': formatIsoDate(context.documentDate),
    'document.number': context.documentNumber ?? '',
    'doctor.full_name': context.doctor.full_name,
    'doctor.specialty': context.doctor.specialty ?? '',
  }
  return text.replace(/\{([a-z_]+\.[a-z_]+)\}/g, (match, key: string) =>
    key in variables ? variables[key as TemplateVariable] : match,
  )
}
