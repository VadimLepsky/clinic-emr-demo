import type { Patient, StaffRole } from '@/lib/types'
import { formatDate as formatIsoDate } from '@/lib/format'

export { formatAge } from '@/lib/format'

export const roleLabels: Record<StaffRole, string> = {
  manager: 'Practice manager',
  doctor: 'Provider',
  medical_staff: 'Nurse',
  contact_center: 'Contact center',
  reception: 'Front desk',
}

export const sexLabels: Record<NonNullable<Patient['sex']>, string> = {
  male: 'Male',
  female: 'Female',
}

export function formatDate(iso: string | null): string {
  return iso ? formatIsoDate(iso) : '—'
}
