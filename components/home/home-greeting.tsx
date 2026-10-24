'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { countTodayDocuments, listTodayPrescriptions, listTodayVisits } from '@/lib/data'
import type { Staff } from '@/lib/types'
import { ThemeToggle } from '@/components/app-shell/theme-toggle'
import { monthLabel } from '@/components/prescriptions/period'

function greetingFor(hour: number) {
  if (hour >= 5 && hour < 12) return 'Доброго ранку'
  if (hour >= 12 && hour < 18) return 'Доброго дня'
  return 'Доброго вечора'
}

function plural(n: number, [one, few, many]: [string, string, string]) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function addressName(fullName: string) {
  const words = fullName.trim().split(/\s+/)
  return words.length > 1 ? words.slice(1).join(' ') : words[0]
}

function useHour() {
  const [hour, setHour] = useState<number | null>(null)
  useEffect(() => setHour(new Date().getHours()), [])
  return hour
}

function DoctorSummary({ userId }: { userId: string }) {
  const { data: visits } = useSWR(['visits', 'today', userId], ([, , id]) => listTodayVisits(id))
  const { data: documents } = useSWR(['documents', 'today-count', userId], ([, , id]) => countTodayDocuments(id))
  if (!visits || documents === undefined) return <>&nbsp;</>
  return (
    <>
      Сьогодні {visits.length} {plural(visits.length, ['запис', 'записи', 'записів'])} · {documents}{' '}
      {plural(documents, ['висновок', 'висновки', 'висновків'])} створено
    </>
  )
}

// Count only: reception and the contact centre don't see the day's total (docs/CONTEXT.md).
function ReceptionSummary() {
  const { data: prescriptions } = useSWR(['prescriptions', 'today'], () => listTodayPrescriptions())
  if (!prescriptions) return <>&nbsp;</>
  return (
    <>
      Сьогодні {prescriptions.length} {plural(prescriptions.length, ['призначення', 'призначення', 'призначень'])}
    </>
  )
}

export function HomeGreeting({ user }: { user: Staff }) {
  const hour = useHour()

  // pb-9 + gap-6 of Page: 60px from the subtitle to the content, as under PageHeader on other pages.
  return (
    <header className="flex items-center gap-4 pb-9">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h1 className="truncate text-3xl font-semibold text-balance">
          {hour === null ? (
            <>&nbsp;</>
          ) : (
            <>
              {greetingFor(hour)}, {addressName(user.full_name)}<span aria-hidden="true" className="ml-4">👋</span>
            </>
          )}
        </h1>
        <p className="min-h-6 truncate text-base text-muted-foreground">
          {user.role === 'manager' ? (
            <>Огляд за {monthLabel('current')}</>
          ) : user.role === 'reception' || user.role === 'contact_center' ? (
            <ReceptionSummary />
          ) : (
            <DoctorSummary userId={user.id} />
          )}
        </p>
      </div>
      {/* Centered on the 36px title line, like the toggle in PageHeader on other pages; renders nothing for non-managers. */}
      <ThemeToggle className="-mt-0.5 self-start" />
    </header>
  )
}
