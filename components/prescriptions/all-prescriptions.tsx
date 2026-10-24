'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { ClipboardListIcon } from 'lucide-react'
import {
  getCurrentUser,
  listAllPrescriptions,
  listStaff,
  type PrescriptionDisplayStatus,
  type PrescriptionFilters,
} from '@/lib/data'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Page, PageHeader } from '@/components/app-shell/page'
import { Card, CardAction, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/components/documents/format'
import { formatMoney, prescriptionStatusMeta } from './format'
import { periodRange, type Period } from './period'
import { CompletionBar, PrescriptionRowActions, PrescriptionStatusBadge } from './prescription-parts'
import { DeletePrescriptionDialog } from './delete-prescription-dialog'
import { PrescriptionDialog } from './prescription-dialog'
import { usePrintPrescription } from './print-prescription'

const ALL = 'all'

const periodItems: { value: Period; label: string }[] = [
  { value: 'all', label: 'Увесь час' },
  { value: 'current', label: 'Поточний місяць' },
  { value: 'previous', label: 'Попередній місяць' },
]

const statusItems = [
  { value: ALL, label: 'Усі статуси' },
  ...(Object.keys(prescriptionStatusMeta) as PrescriptionDisplayStatus[]).map((value) => ({
    value,
    label: prescriptionStatusMeta[value].shortLabel,
  })),
]

type Props = { initialPeriod: Period; initialDoctorId: string }

export function AllPrescriptions({ initialPeriod, initialDoctorId }: Props) {
  const [period, setPeriod] = useState<Period>(initialPeriod)
  const [doctorId, setDoctorId] = useState<string>(initialDoctorId || ALL)
  const [status, setStatus] = useState<string>(ALL)
  const [selected, setSelected] = useState<{ patientId: string; id: string } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { print, printing, printingId } = usePrintPrescription()

  const { data: staff } = useSWR('staff', () => listStaff())
  const { data: currentUser } = useSWR('current-user', getCurrentUser)
  const isManager = currentUser?.role === 'manager'
  // Reception and the contact centre work with the prescription itself: the row (and the patient name) opens it,
  // and «Карта пацієнта» takes the place of «Переглянути». Other roles keep the name as the link to the card.
  const rowOpensPrescription = currentUser?.role === 'reception' || currentUser?.role === 'contact_center'
  const openPrescription = (rx: { patient_id: string; id: string }) => setSelected({ patientId: rx.patient_id, id: rx.id })
  const doctorItems = [
    { value: ALL, label: 'Усі лікарі' },
    ...(staff ?? []).filter((s) => s.role === 'doctor').map((s) => ({ value: s.id, label: s.full_name })),
  ]

  const filters: PrescriptionFilters = {
    ...periodRange(period),
    doctorId: doctorId === ALL ? undefined : doctorId,
    status: status === ALL ? undefined : (status as PrescriptionDisplayStatus),
  }
  const { data: rows } = useSWR(['prescriptions', 'all', filters], ([, , f]) => listAllPrescriptions(f))

  return (
    <Page width="wide">
      <PageHeader title="Призначення" />

      <Card>
        <CardHeader className="border-b-0">
          <CardTitle>Усі призначення</CardTitle>
          <CardAction>
            <Select items={periodItems} value={period} onValueChange={(v) => v && setPeriod(v as Period)}>
              <SelectTrigger aria-label="Період" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select items={doctorItems} value={doctorId} onValueChange={(v) => v && setDoctorId(v as string)}>
              <SelectTrigger aria-label="Лікар" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {doctorItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select items={statusItems} value={status} onValueChange={(v) => v && setStatus(v as string)}>
              <SelectTrigger aria-label="Статус" className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>

        {!rows || !currentUser ? (
          <div className="flex flex-col gap-3 px-8 py-6" aria-busy="true">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-8 py-12 text-center text-muted-foreground">
            <ClipboardListIcon className="size-6" aria-hidden="true" />
            За обраними фільтрами призначень немає.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Дата</TableHead>
                <TableHead>Пацієнт</TableHead>
                <TableHead>Лікар</TableHead>
                <TableHead className="text-right">Сума</TableHead>
                <TableHead className="w-24">Виконання</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-px text-right">Дії</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((rx) => (
                <TableRow
                  key={rx.id}
                  className={rowOpensPrescription ? 'cursor-pointer' : undefined}
                  onClick={rowOpensPrescription ? () => openPrescription(rx) : undefined}
                >
                  <TableCell className="tabular-nums">{formatDate(rx.created_at)}</TableCell>
                  <TableCell className="font-semibold whitespace-normal">
                    {rowOpensPrescription ? (
                      <button
                        type="button"
                        aria-label={`Відкрити призначення: ${rx.patient_name}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          openPrescription(rx)
                        }}
                        className="block min-w-32 cursor-pointer text-left underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                      >
                        {rx.patient_name}
                      </button>
                    ) : (
                      <Link
                        href={`/patients/${rx.patient_id}`}
                        className="block min-w-32 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                      >
                        {rx.patient_name}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="min-w-32 whitespace-normal">{rx.doctor_name}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(rx.total_amount)}</TableCell>
                  <TableCell>
                    <CompletionBar pct={rx.completion_pct} label={`Виконання: ${rx.patient_name}`} />
                  </TableCell>
                  <TableCell className="min-w-32 whitespace-normal">
                    <PrescriptionStatusBadge summary={rx} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <PrescriptionRowActions
                      subject={`${rx.patient_name}, ${formatDate(rx.created_at)}`}
                      onView={rowOpensPrescription ? undefined : () => openPrescription(rx)}
                      patientHref={rowOpensPrescription ? `/patients/${rx.patient_id}` : undefined}
                      onPrint={() => print(rx.id)}
                      printing={printingId === rx.id}
                      printDisabled={printing}
                      onDelete={isManager ? () => setDeleteId(rx.id) : undefined}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <PrescriptionDialog
        patientId={selected?.patientId ?? ''}
        target={selected?.id ?? null}
        onTargetChange={(target) => setSelected(target && target !== 'new' && selected ? { ...selected, id: target } : null)}
      />
      <DeletePrescriptionDialog prescriptionId={deleteId} onClose={() => setDeleteId(null)} />
    </Page>
  )
}
