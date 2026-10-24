import { getPrescriptionDisplayStatus, type PrescriptionDisplayStatus } from '@/lib/data'
import type { PrescriptionSummary, Service } from '@/lib/types'
import { formatDate, formatSheetDate } from '@/lib/format'

export { formatMoney, formatMoneyWhole } from '@/lib/format'

export function serviceSourceLabel(service: Service) {
  return service.source === 'crm' ? 'Clinic' : (service.lab_name ?? 'Laboratory')
}

/** The care plan's title on the sheet (24/10/2026) and in its dialog (24 Oct 2026), from its creation date. */
export function prescriptionTitle(isoDate: string, place: 'sheet' | 'dialog' = 'sheet') {
  return `Care plan from the visit on ${place === 'sheet' ? formatSheetDate(isoDate) : formatDate(isoDate)}`
}

export function lineTotal(unitPrice: number, quantity: number, discountPct: number) {
  return unitPrice * quantity * (1 - discountPct / 100)
}

// shortLabel — lists, filters and home pages; label — only the badge in the care plan dialog header.
export const prescriptionStatusMeta: Record<
  PrescriptionDisplayStatus,
  { label: string; shortLabel: string; className: string }
> = {
  active: { label: 'Active', shortLabel: 'Active', className: 'bg-status-success-bg text-status-success-fg' },
  locked: {
    label: 'Paid, editing closed',
    shortLabel: 'Paid',
    className: 'bg-status-info-bg text-status-info-fg',
  },
  completed: { label: 'Completed', shortLabel: 'Completed', className: 'bg-status-neutral-bg text-status-neutral-fg' },
}

export function prescriptionStatus(summary: PrescriptionSummary) {
  return prescriptionStatusMeta[getPrescriptionDisplayStatus(summary)]
}
