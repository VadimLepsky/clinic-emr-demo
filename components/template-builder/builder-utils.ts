import type {
  Block,
  FieldBlock,
  ImageBlock,
  Section,
  ServicesBlock,
  Template,
  TemplateKind,
  TemplateSchema,
  TemplateVariable,
} from '@/lib/types'

export type TemplateMeta = Pick<
  Template,
  | 'name'
  | 'kind'
  | 'specialty'
  | 'folder_id'
  | 'header_id'
  | 'footer_id'
  | 'footer_text'
  | 'show_signature'
  | 'banner_image_url'
  | 'footer_image_url'
  | 'package_ids'
>

export const kindOptions: { value: TemplateKind; label: string }[] = [
  { value: 'consultation', label: 'Консультація' },
  { value: 'ultrasound', label: 'УЗД' },
  { value: 'lab', label: 'Аналізи' },
  { value: 'certificate', label: 'Довідка' },
  { value: 'other', label: 'Інше' },
]

export const kindLabels = Object.fromEntries(kindOptions.map((k) => [k.value, k.label])) as Record<TemplateKind, string>

export const serviceCategoryOptions: { value: ServicesBlock['category']; label: string }[] = [
  { value: 'lab', label: 'Аналізи' },
  { value: 'instrumental', label: 'Інструментальна діагностика' },
  { value: 'consultation', label: 'Консультації' },
]

export const templateVariables: { key: TemplateVariable; label: string }[] = [
  { key: 'patient.full_name', label: 'ПІБ пацієнта' },
  { key: 'patient.age', label: 'Вік' },
  { key: 'patient.birth_date', label: 'Дата народження' },
  { key: 'patient.crm_client_id', label: 'Номер медкарти' },
  { key: 'document.date', label: 'Дата прийому' },
  { key: 'document.number', label: 'Номер документа' },
  { key: 'doctor.full_name', label: 'ПІБ лікаря' },
  { key: 'doctor.specialty', label: 'Спеціалізація' },
]

// The patient block of a printed document (DocumentSheet, view): Дата, Медкарта №, Пацієнт, День народження;
// Документ №, Спеціаліст.
export const autoFilledInfo = [
  'Дата прийому',
  'Номер медкарти',
  'ПІБ пацієнта',
  'Дата народження',
  'Номер документа',
  'ПІБ лікаря',
]

export function collectIds(schema: TemplateSchema): string[] {
  return schema.sections.flatMap((s) => [
    s.id,
    ...s.blocks.flatMap((b) => (b.kind === 'group' ? [b.id, ...b.blocks.map((f) => f.id)] : [b.id])),
  ])
}

/** Stable id, unique within the template; never regenerated on rename or reorder. */
export function createId(prefix: 'sec' | 'f', schema: TemplateSchema): string {
  const taken = new Set(collectIds(schema))
  let id: string
  do {
    id = `${prefix}_${Math.random().toString(36).slice(2, 10)}`
  } while (taken.has(id))
  return id
}

export type BlockKindChoice = 'text' | 'select' | 'checkbox' | 'group' | 'static' | 'services' | 'image'

export const blockChoices: { value: BlockKindChoice; label: string }[] = [
  { value: 'text', label: 'Текстове поле' },
  { value: 'select', label: 'Випадаючий список' },
  { value: 'checkbox', label: 'Чекбокс' },
  { value: 'group', label: 'Секція' },
  { value: 'static', label: 'Текст зі змінними' },
  { value: 'services', label: 'Рекомендовані послуги' },
  { value: 'image', label: 'Зображення' },
]

export const imageWidthOptions: { value: ImageBlock['width']; label: string }[] = [
  { value: 'auto', label: 'Авто' },
  { value: 'third', label: '⅓' },
  { value: 'half', label: '½' },
  { value: 'full', label: 'Вся ширина' },
]

export const imageAlignOptions: { value: ImageBlock['align']; label: string }[] = [
  { value: 'left', label: 'Ліворуч' },
  { value: 'center', label: 'По центру' },
  { value: 'right', label: 'Праворуч' },
]

export function createField(choice: 'text' | 'select' | 'checkbox', id: string): FieldBlock {
  if (choice === 'select') return { kind: 'field', id, type: 'select', label: '', description: '', options: ['Варіант 1'] }
  if (choice === 'checkbox') return { kind: 'field', id, type: 'checkbox', label: '', description: '', defaultValue: false }
  return { kind: 'field', id, type: 'text', label: '', description: '' }
}

export function createBlock(choice: BlockKindChoice, id: string): Block {
  switch (choice) {
    case 'group':
      return { kind: 'group', id, title: '', blocks: [] }
    case 'static':
      return { kind: 'static', id, text: '' }
    case 'services':
      return { kind: 'services', id, label: 'Аналізи', category: 'lab' }
    case 'image':
      return { kind: 'image', id, src: '', alt: '', width: 'auto', align: 'center' }
    default:
      return createField(choice, id)
  }
}

// rec_external (free text «поза клінікою») exists only in old templates: such services are now chips in the
// services fields («Додати «…» як послугу поза клінікою»). It stays here so an old section is still recognised.
export const RECOMMENDATION_IDS = [
  'rec_lab',
  'rec_instrumental',
  'rec_consultation',
  'rec_external',
  'rec_lifestyle',
  'rec_drugs',
] as const

/** The services fields feed the prescription, so these ids are fixed. */
export function createRecommendationsSection(sectionId: string): Section {
  return {
    id: sectionId,
    title: 'Рекомендації',
    blocks: [
      { kind: 'services', id: 'rec_lab', label: 'Аналізи', category: 'lab' },
      { kind: 'services', id: 'rec_instrumental', label: 'Інструментальна діагностика', category: 'instrumental' },
      { kind: 'services', id: 'rec_consultation', label: 'Консультації спеціалістів', category: 'consultation' },
      { kind: 'field', id: 'rec_lifestyle', type: 'textarea', label: 'Спосіб життя', description: 'Харчування, режим, фізична активність' },
      { kind: 'field', id: 'rec_drugs', type: 'textarea', label: 'Медикаментозне лікування', description: 'Препарати, дозування, тривалість' },
    ],
  }
}

export type BuilderErrors = Record<string, string>

export const errorKey = (id: string, part: 'label' | 'options' | 'id' | 'src') => `${id}:${part}`
export const errorElementId = (key: string) => `tb-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`
export const sectionAnchorId = (sectionId: string) => `tb-section-${sectionId}`

/** Returned in document order, so the first key is the first error on the page. */
export function validateTemplate(meta: TemplateMeta, schema: TemplateSchema): BuilderErrors {
  const errors: BuilderErrors = {}
  if (!meta.name.trim()) errors.name = 'Вкажіть назву шаблону'

  const seen = new Set<string>()
  const checkId = (id: string) => {
    if (seen.has(id)) errors[errorKey(id, 'id')] = 'Ідентифікатор блоку повторюється'
    seen.add(id)
  }
  const checkField = (field: FieldBlock) => {
    checkId(field.id)
    // The name is optional: without it the sheet prints only the value.
    if (field.type === 'select' || field.type === 'multiselect') {
      const options = (field.options ?? []).map((o) => o.trim())
      if (!options.length) errors[errorKey(field.id, 'options')] = 'Додайте хоча б один варіант'
      else if (options.some((o) => !o)) errors[errorKey(field.id, 'options')] = 'Заповніть усі варіанти'
      else if (new Set(options).size !== options.length) errors[errorKey(field.id, 'options')] = 'Варіанти повторюються'
    }
  }

  for (const section of schema.sections) {
    checkId(section.id)
    for (const block of section.blocks) {
      if (block.kind === 'field') checkField(block)
      else if (block.kind === 'group') {
        checkId(block.id)
        block.blocks.forEach(checkField)
      } else {
        checkId(block.id)
        if (block.kind === 'services' && !block.label.trim()) errors[errorKey(block.id, 'label')] = 'Вкажіть назву блоку'
        if (block.kind === 'image' && !block.src) errors[errorKey(block.id, 'src')] = 'Завантажте зображення'
      }
    }
  }
  return errors
}
