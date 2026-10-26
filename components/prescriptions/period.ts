import { formatMonthYear } from '@/lib/format'

export type Period = 'all' | 'current' | 'previous'

function toIso(date: Date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

export function isPeriod(value: string | undefined): value is Period {
  return value === 'all' || value === 'current' || value === 'previous'
}

export function periodRange(period: Period): { from?: string; to?: string } {
  if (period === 'all') return {}
  const now = new Date()
  const offset = period === 'current' ? 0 : -1
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  return { from: toIso(first), to: toIso(last) }
}

export function monthLabel(period: 'current' | 'previous') {
  const now = new Date()
  return formatMonthYear(now.getFullYear(), now.getMonth() + (period === 'current' ? 0 : -1))
}
