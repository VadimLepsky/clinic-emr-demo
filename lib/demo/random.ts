// Seeded randomness and calendar helpers for the demo generator. The same seed and the same «today» give the same
// data on the server and in the browser, so ids and values match across hydration.

export type Rng = {
  /** 0 ≤ x < 1 */
  next: () => number
  int: (min: number, max: number) => number
  float: (min: number, max: number, digits?: number) => number
  chance: (p: number) => boolean
  pick: <T>(items: readonly T[]) => T
  shuffle: <T>(items: readonly T[]) => T[]
}

/** mulberry32: small, fast and good enough for demo data. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))
  return {
    next,
    int,
    float: (min, max, digits = 1) => Number((min + next() * (max - min)).toFixed(digits)),
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)],
    shuffle: (items) => {
      const copy = [...items]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    },
  }
}

// ---- Calendar: ISO dates (YYYY-MM-DD) counted in whole days, so no time zone can shift them.

const DAY_MS = 24 * 60 * 60 * 1000

function toUtc(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function addDays(iso: string, days: number): string {
  return new Date(toUtc(iso) + days * DAY_MS).toISOString().slice(0, 10)
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((toUtc(toIso) - toUtc(fromIso)) / DAY_MS)
}

/** 0 — Sunday … 6 — Saturday. */
export function weekday(iso: string): number {
  return new Date(toUtc(iso)).getUTCDay()
}

/** Local wall-clock datetime, the format the mocks use: 2026-10-24T09:30:00. */
export function at(iso: string, minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0')
  const m = String(minutes % 60).padStart(2, '0')
  return `${iso}T${h}:${m}:00`
}

/** Minutes since midnight of a local datetime produced by `at`. */
export function minutesOf(datetime: string): number {
  const [h, m] = datetime.slice(11, 16).split(':').map(Number)
  return h * 60 + m
}

export function addMinutes(datetime: string, minutes: number): string {
  const total = minutesOf(datetime) + minutes
  return at(datetime.slice(0, 10), Math.min(total, 23 * 60 + 59))
}
