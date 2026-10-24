import type { Patient, StaffRole } from '@/lib/types'

export const roleLabels: Record<StaffRole, string> = {
  manager: 'Керівник',
  doctor: 'Лікар',
  medical_staff: 'Медичний персонал',
  contact_center: 'Контакт-центр',
  reception: 'Рецепція',
}

export const sexLabels: Record<NonNullable<Patient['sex']>, string> = {
  male: 'Чоловіча',
  female: 'Жіноча',
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

export function formatAge(age: number | null): string {
  if (age === null) return '—'
  const mod10 = age % 10
  const mod100 = age % 100
  if (mod10 === 1 && mod100 !== 11) return `${age} рік`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${age} роки`
  return `${age} років`
}
