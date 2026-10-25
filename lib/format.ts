// Dates, times, money and counts for the interface and the A4 sheets (en-US, USD). Pure: no data access, so the
// template form renderer can use it too. Month names are spelled out here rather than taken from Intl, so the
// server and the browser always agree.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

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

/** Interface: Apr 27, 2026. */
export function formatDate(iso: string): string {
  const [y, m, d] = dateParts(iso)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

/** A4 sheets and print: 04/27/2026. */
export function formatSheetDate(iso: string): string {
  const [y, m, d] = dateParts(iso)
  return `${pad(m)}/${pad(d)}/${y}`
}

/** 12-hour clock: 9:30 AM, 2:24 PM. */
export function formatTime(iso: string): string {
  const date = new Date(iso)
  const hours = date.getHours()
  return `${hours % 12 || 12}:${pad(date.getMinutes())} ${hours < 12 ? 'AM' : 'PM'}`
}

/** Apr 27, 2026, 2:24 PM */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`
}

/** October 2026 — `month` is 0-based, as in Date. */
export function formatMonthYear(year: number, month: number): string {
  const date = new Date(year, month, 1)
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
}

/** Stored title of orders created on `iso` (a date or a datetime). */
export function carePlanTitle(iso: string): string {
  return `Orders from the visit on ${formatDate(iso.slice(0, 10))}`
}

const moneyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const wholeMoneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

/** $1,234.50 */
export function formatMoney(amount: number): string {
  return moneyFormatter.format(amount)
}

/** $1,235 — KPI figures, where cents are noise. */
export function formatMoneyWhole(amount: number): string {
  return wholeMoneyFormatter.format(amount)
}

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

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
