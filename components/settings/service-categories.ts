import type { ServiceCategory } from '@/lib/types'

export const serviceCategories: { value: ServiceCategory; label: string }[] = [
  { value: 'lab', label: 'Lab tests' },
  { value: 'instrumental', label: 'Instrumental diagnostics' },
  { value: 'consultation', label: 'Consultations' },
  { value: 'other', label: 'Other' },
]

export const serviceCategoryLabels = Object.fromEntries(
  serviceCategories.map((c) => [c.value, c.label]),
) as Record<ServiceCategory, string>
