'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { CalendarOffIcon } from 'lucide-react'
import { calcAge, countTodayDocuments, listTodayVisits, type TodayVisit } from '@/lib/data'
import { formatAge } from '@/components/app-shell/labels'
import { formatTime } from '@/components/documents/format'
import { TemplatePickerDialog } from '@/components/documents/template-picker-dialog'
import { PatientSearch } from '@/components/patients/patient-search'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { NewVisitDialog } from './new-visit-dialog'
import { SummaryCard } from './summary-card'

// The «Start visit» column is hidden on narrow screens; its fixed width keeps every row's grid lined up.
const rowClass =
  'grid grid-cols-[3.5rem_1fr_6.5rem] items-center gap-x-4 gap-y-0.5 px-8 py-5 sm:grid-cols-[4rem_1fr_7rem_9rem_9rem]'

/** Every visit starts a new document, even when one was already made today (the badge says so). */
function VisitRow({ visit, onStart }: { visit: TodayVisit; onStart: (patientId: string) => void }) {
  const time = <span className="font-medium tabular-nums">{formatTime(visit.visit_at)}</span>
  const badge = visit.has_document_today ? (
    <span className="justify-self-end rounded-md bg-status-success-bg px-2 py-1 text-xs leading-tight font-medium text-status-success-fg sm:whitespace-nowrap">
      Note created
    </span>
  ) : (
    <span className="justify-self-end rounded-md bg-status-neutral-bg px-2 py-1 text-xs leading-tight font-medium text-status-neutral-fg">
      Waiting
    </span>
  )

  if (!visit.patient) {
    return (
      <div className={cn(rowClass, 'text-muted-foreground')}>
        {time}
        <span>No patient with CRM ID {visit.crm_client_id} in the records</span>
        <span className="hidden sm:block" />
        <span className="hidden sm:block" />
        {badge}
      </div>
    )
  }

  const patient = visit.patient

  // The whole row opens the patient card (the name link is stretched over it); «Start visit» sits on top
  // and opens the template picker instead.
  return (
    <div
      className={cn(rowClass, 'relative transition-colors hover:bg-accent has-[[data-row-link]:focus-visible]:bg-accent')}
    >
      {time}
      <Link
        href={`/patients/${patient.id}`}
        data-row-link
        className="font-semibold outline-none before:absolute before:inset-0 before:content-['']"
      >
        {patient.full_name}
      </Link>
      <span className="hidden text-muted-foreground sm:block">{formatAge(calcAge(patient.birth_date))}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onStart(patient.id)}
        aria-label={`Start visit: ${patient.full_name}`}
        className="relative z-10 hidden justify-self-end sm:inline-flex"
      >
        Start visit
      </Button>
      {badge}
    </div>
  )
}

/** Home for doctors and nurses. A visit starts with an explicit template choice: the picker shows the
 *  templates this user may fill in (a doctor — consultations and certificates, an ultrasound doctor — ultrasound). */
export function DoctorHome({ userId }: { userId: string }) {
  const { data: visits } = useSWR(['visits', 'today', userId], ([, , id]) => listTodayVisits(id))
  const { data: documents } = useSWR(['documents', 'today-count', userId], ([, , id]) => countTodayDocuments(id))
  const [pickerPatientId, setPickerPatientId] = useState<string | null>(null)

  const summary =
    visits && documents !== undefined
      ? [
          { label: 'Appointments', value: String(visits.length) },
          { label: 'Notes created', value: String(documents) },
          { label: 'Awaiting a note', value: String(visits.filter((v) => v.patient && !v.has_document_today).length) },
        ]
      : undefined

  return (
    <div className="grid items-start gap-6 xl:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
        <PatientSearch />

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s patients</CardTitle>
            <NewVisitDialog />
          </CardHeader>
          {!visits ? (
            <div className="flex flex-col gap-3 px-8 py-6" aria-busy="true">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : visits.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-8 py-12 text-center text-muted-foreground">
              <CalendarOffIcon className="size-6" aria-hidden="true" />
              No appointments in the CRM for today.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {visits.map((visit) => (
                <li key={visit.crm_visit_id}>
                  <VisitRow visit={visit} onStart={setPickerPatientId} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <SummaryCard title="Today" items={summary} />

      <TemplatePickerDialog patientId={pickerPatientId} onClose={() => setPickerPatientId(null)} />
    </div>
  )
}
