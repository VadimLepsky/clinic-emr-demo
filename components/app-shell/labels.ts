import type { Patient, StaffRole } from '@/lib/types'
import { formatDate as formatIsoDate } from '@/lib/format'

export { formatAge } from '@/lib/format'

export const roleLabels: Record<StaffRole, string> = {
  manager: 'Clinic manager',
  doctor: 'Doctor',
  medical_staff: 'Nurse',
  contact_center: 'Contact centre',
  reception: 'Front desk',
}

export const sexLabels: Record<NonNullable<Patient['sex']>, string> = {
  male: 'Male',
  female: 'Female',
}

export function formatDate(iso: string | null): string {
  return iso ? formatIsoDate(iso) : '—'
}
