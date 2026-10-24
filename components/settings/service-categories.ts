import type { ServiceCategory } from '@/lib/types'

export const serviceCategories: { value: ServiceCategory; label: string }[] = [
  { value: 'lab', label: 'Аналізи' },
  { value: 'instrumental', label: 'Інструментальна діагностика' },
  { value: 'consultation', label: 'Консультації' },
  { value: 'other', label: 'Інше' },
]

export const serviceCategoryLabels = Object.fromEntries(
  serviceCategories.map((c) => [c.value, c.label]),
) as Record<ServiceCategory, string>
