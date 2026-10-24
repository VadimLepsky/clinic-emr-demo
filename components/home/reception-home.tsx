'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { ClipboardListIcon, Loader2Icon } from 'lucide-react'
import { listTodayPrescriptions } from '@/lib/data'
import { PatientSearch } from '@/components/patients/patient-search'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatTime } from '@/components/documents/format'
import { formatMoney } from '@/components/prescriptions/format'
import { PrescriptionStatusBadge } from '@/components/prescriptions/prescription-parts'
import { PrescriptionDialog } from '@/components/prescriptions/prescription-dialog'
import { usePrintPrescription } from '@/components/prescriptions/print-prescription'
import { SummaryCard } from './summary-card'

const REFRESH_INTERVAL_MS = 60_000

export function ReceptionHome() {
  const [selected, setSelected] = useState<{ patientId: string; id: string } | null>(null)
  const openPrescription = (rx: { patient_id: string; id: string }) => setSelected({ patientId: rx.patient_id, id: rx.id })
  const { print, printing, printingId } = usePrintPrescription()
  const { data: prescriptions } = useSWR(['prescriptions', 'today'], () => listTodayPrescriptions(), {
    refreshInterval: REFRESH_INTERVAL_MS,
  })

  // Front desk and the contact centre see only how many care plans there are today: no day totals or payments.
  // The amount of each care plan stays in its row.
  const summary = prescriptions ? [{ label: 'Care plans', value: String(prescriptions.length) }] : undefined

  return (
    <div className="grid items-start gap-6 xl:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
        <PatientSearch />

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s care plans</CardTitle>
          </CardHeader>
          {!prescriptions ? (
            <div className="flex flex-col gap-3 px-8 py-6" aria-busy="true">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-8 py-12 text-center text-muted-foreground">
              <ClipboardListIcon className="size-6" aria-hidden="true" />
              No care plans have been created today yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((rx) => (
                  // The whole row opens the care plan; the patient name is its keyboard path, the record is in «Actions».
                  <TableRow key={rx.id} className="cursor-pointer" onClick={() => openPrescription(rx)}>
                    <TableCell className="tabular-nums">{formatTime(rx.created_at)}</TableCell>
                    <TableCell className="font-semibold whitespace-normal">
                      <button
                        type="button"
                        aria-label={`Open care plan: ${rx.patient_name}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          openPrescription(rx)
                        }}
                        className="cursor-pointer text-left underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                      >
                        {rx.patient_name}
                      </button>
                    </TableCell>
                    <TableCell className="whitespace-normal">{rx.doctor_name}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(rx.total_amount)}</TableCell>
                    <TableCell className="min-w-36 whitespace-normal">
                      <PrescriptionStatusBadge summary={rx} />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col items-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/patients/${rx.patient_id}`} />}
                        >
                          Patient record
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => print(rx.id)} disabled={printing}>
                          {printingId === rx.id && <Loader2Icon className="animate-spin" aria-hidden="true" />}
                          Print
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <SummaryCard title="Today" items={summary} loadingRows={1} />

      <PrescriptionDialog
        patientId={selected?.patientId ?? ''}
        target={selected?.id ?? null}
        onTargetChange={(target) => setSelected(target && target !== 'new' && selected ? { ...selected, id: target } : null)}
      />
    </div>
  )
}
