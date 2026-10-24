'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { ClipboardListIcon, PlusIcon } from 'lucide-react'
import { canEditPrescriptions, getCurrentUser, listPrescriptions } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/components/documents/format'
import { DeletePrescriptionDialog } from './delete-prescription-dialog'
import { formatMoney } from './format'
import { CompletionBar, PrescriptionRowActions, PrescriptionStatusBadge } from './prescription-parts'
import { PrescriptionDialog, type PrescriptionTarget } from './prescription-dialog'
import { usePrintPrescription } from './print-prescription'

export function PrescriptionsTab({ patientId }: { patientId: string }) {
  const [target, setTarget] = useState<PrescriptionTarget>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { print, printing, printingId } = usePrintPrescription()

  const { data: prescriptions } = useSWR(['prescriptions', patientId], ([, id]) => listPrescriptions(id))
  const { data: currentUser } = useSWR('current-user', getCurrentUser)
  const isManager = currentUser?.role === 'manager'
  const canCreate = Boolean(currentUser && canEditPrescriptions(currentUser.role))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Призначення</CardTitle>
        {canCreate && (
          <Button onClick={() => setTarget('new')}>
            <PlusIcon className="size-4" aria-hidden="true" />
            Створити призначення
          </Button>
        )}
      </CardHeader>

      {!prescriptions ? (
        <div className="flex flex-col gap-3 px-8 py-6" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-8 py-12 text-center text-muted-foreground">
          <ClipboardListIcon className="size-6" aria-hidden="true" />
          Призначень поки немає.
        </div>
      ) : (
        <Table className="[&_th]:h-auto [&_th]:py-3 [&_th]:whitespace-normal">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Назва</TableHead>
              <TableHead>Лікар</TableHead>
              <TableHead>Дата створення</TableHead>
              <TableHead className="text-right">Сума призначень</TableHead>
              <TableHead className="text-right">Використано</TableHead>
              <TableHead className="min-w-24">Виконання</TableHead>
              <TableHead className="text-right">Сума оплат</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-px text-right">Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prescriptions.map((rx) => {
              return (
                <TableRow key={rx.id}>
                  <TableCell className="max-w-56 whitespace-normal">
                    <span className="block font-medium">{rx.title}</span>
                    {rx.source_document_id && (
                      <Link
                        href={`/patients/${patientId}/documents/${rx.source_document_id}`}
                        className="text-sm text-primary underline-offset-4 hover:underline"
                      >
                        Висновок
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-normal">{rx.doctor_name}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(rx.created_at)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(rx.total_amount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(rx.used_amount)}</TableCell>
                  <TableCell>
                    <CompletionBar pct={rx.completion_pct} label={`Виконання: ${rx.title}`} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(rx.paid_amount)}</TableCell>
                  <TableCell className="whitespace-normal">
                    <PrescriptionStatusBadge summary={rx} />
                  </TableCell>
                  <TableCell>
                    <PrescriptionRowActions
                      subject={rx.title}
                      onView={() => setTarget(rx.id)}
                      onPrint={() => print(rx.id)}
                      printing={printingId === rx.id}
                      printDisabled={printing}
                      onDelete={isManager ? () => setDeleteId(rx.id) : undefined}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <PrescriptionDialog patientId={patientId} target={target} onTargetChange={setTarget} />
      <DeletePrescriptionDialog prescriptionId={deleteId} onClose={() => setDeleteId(null)} />
    </Card>
  )
}
