import { getPrescriptionDisplayStatus, type PrescriptionDisplayStatus } from '@/lib/data'
import type { PrescriptionSummary, Service } from '@/lib/types'
import { formatDate } from '@/components/documents/format'

const moneyFormatter = new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export function formatMoney(amount: number) {
  return `${moneyFormatter.format(amount)} грн`
}

export function serviceSourceLabel(service: Service) {
  return service.source === 'crm' ? 'Клініка' : (service.lab_name ?? 'Лабораторія')
}

/** The prescription's title on the sheet and in its dialog, from its creation date. */
export function prescriptionTitle(isoDate: string) {
  return `Призначення з візиту від ${formatDate(isoDate)}`
}

export function lineTotal(unitPrice: number, quantity: number, discountPct: number) {
  return unitPrice * quantity * (1 - discountPct / 100)
}

// shortLabel — lists, filters and home pages; label — only the badge in the prescription dialog header.
export const prescriptionStatusMeta: Record<
  PrescriptionDisplayStatus,
  { label: string; shortLabel: string; className: string }
> = {
  active: { label: 'Активне', shortLabel: 'Активне', className: 'bg-status-success-bg text-status-success-fg' },
  locked: {
    label: 'Оплачено, редагування закрите',
    shortLabel: 'Оплачено',
    className: 'bg-status-info-bg text-status-info-fg',
  },
  completed: { label: 'Виконано', shortLabel: 'Виконано', className: 'bg-status-neutral-bg text-status-neutral-fg' },
}

export function prescriptionStatus(summary: PrescriptionSummary) {
  return prescriptionStatusMeta[getPrescriptionDisplayStatus(summary)]
}
