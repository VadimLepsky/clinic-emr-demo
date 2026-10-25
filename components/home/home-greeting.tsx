'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { countTodayDocuments, listTodayPrescriptions, listTodayVisits } from '@/lib/data'
import type { Staff } from '@/lib/types'
import { ThemeToggle } from '@/components/app-shell/theme-toggle'
import { monthLabel } from '@/components/prescriptions/period'
import { plural } from '@/lib/format'

function greetingFor(hour: number) {
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/** First name: «Emily Carter» → «Emily». */
function addressName(fullName: string) {
  return fullName.trim().split(/\s+/)[0]
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
      Today: {plural(visits.length, 'appointment')} · {plural(documents, 'note')} created
    </>
  )
}

// Count only: front desk and the contact center don't see the day's total.
function ReceptionSummary() {
  const { data: prescriptions } = useSWR(['prescriptions', 'today'], () => listTodayPrescriptions())
  if (!prescriptions) return <>&nbsp;</>
  return (
    <>
      Today: {plural(prescriptions.length, 'order')}
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
            <>Overview for {monthLabel('current')}</>
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
