// Dates, times, money and counts for the interface and the A4 sheets (en-GB, EUR). Pure: no data access, so the
// template form renderer can use it too. Month names are spelled out here rather than taken from Intl, so the
// server and the browser always agree (ICU versions differ on «Sep» vs «Sept»).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** A date-only ISO string is a calendar date; a datetime is read in local time. */
function dateParts(iso: string): [number, number, number] {
  if (iso.length === 10) {
    const [y, m, d] = iso.split('-').map(Number)
    return [y, m, d]
  }
  const date = new Date(iso)
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Interface: 24 Oct 2026. */
export function formatDate(iso: string): string {
  const [y, m, d] = dateParts(iso)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

/** A4 sheets and print: 24/10/2026. */
export function formatSheetDate(iso: string): string {
  const [y, m, d] = dateParts(iso)
  return `${pad(d)}/${pad(m)}/${y}`
}

/** 24-hour clock: 09:30. */
export function formatTime(iso: string): string {
  const date = new Date(iso)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`
}

/** Stored title of a care plan created on `iso` (a date or a datetime). */
export function carePlanTitle(iso: string): string {
  return `Care plan from the visit on ${formatDate(iso.slice(0, 10))}`
}

const moneyFormatter = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' })
const wholeMoneyFormatter = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

/** €1,234.50 */
export function formatMoney(amount: number): string {
  return moneyFormatter.format(amount)
}

/** €1,235 — KPI figures, where cents are noise. */
export function formatMoneyWhole(amount: number): string {
  return wholeMoneyFormatter.format(amount)
}

const numberFormatter = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 })

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

/** «1 file», «3 files»; pass the plural when it isn't just «+s». */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

export function formatAge(age: number | null): string {
  return age === null ? '—' : plural(age, 'year')
}
