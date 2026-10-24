'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR, { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { CopyIcon, Loader2Icon, PrinterIcon } from 'lucide-react'
import {
  canEditPrescriptions,
  canSetPrescriptionDiscount,
  createPrescription,
  duplicatePrescription,
  getClinicSettings,
  getCurrentUser,
  getDocument,
  getPatient,
  getPrescription,
  updatePrescription,
  updatePrescriptionDiscounts,
} from '@/lib/data'
import type { Service } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { SheetBackdrop } from '@/components/document-sheet/sheet-backdrop'
import { formatDate, todayIso } from '@/components/documents/format'
import { formatMoney, prescriptionStatus, prescriptionTitle } from './format'
import {
  PrescriptionSheet,
  isPrescriptionRowValid,
  type PrescriptionSheetMode,
  type PrescriptionSheetRow,
} from './prescription-sheet'
import { ServiceAddSearch } from './service-add-search'
import { usePrintPrescription } from './print-prescription'

export type PrescriptionTarget = string | 'new' | null

type PrescriptionDetail = NonNullable<Awaited<ReturnType<typeof getPrescription>>>

// Row on the sheet plus the saved item id (absent for services added in this session).
type Row = PrescriptionSheetRow & { id?: string }

type PrescriptionDialogProps = {
  patientId: string
  target: PrescriptionTarget
  onTargetChange: (target: PrescriptionTarget) => void
}

export function PrescriptionDialog({ patientId, target, onTargetChange }: PrescriptionDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onTargetChange(null)}>
      <DialogContent showCloseButton={false} className="flex max-h-[92svh] flex-col gap-0 sm:max-w-[900px]">
        {target === 'new' ? (
          <PrescriptionEditor key="new" patientId={patientId} detail={null} onTargetChange={onTargetChange} />
        ) : target ? (
          <ExistingPrescription key={target} id={target} patientId={patientId} onTargetChange={onTargetChange} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ExistingPrescription({
  id,
  ...rest
}: { id: string } & Pick<PrescriptionDialogProps, 'patientId' | 'onTargetChange'>) {
  const { data: detail } = useSWR(['prescription', id], ([, rxId]) => getPrescription(rxId))

  if (detail === undefined) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <DialogHeader>
          <DialogTitle>Призначення</DialogTitle>
          <DialogDescription className="sr-only">Завантаження призначення</DialogDescription>
        </DialogHeader>
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="mx-auto h-[50svh] w-full max-w-[210mm]" />
      </div>
    )
  }

  if (detail === null) {
    return (
      <div className="flex flex-col gap-6">
        <DialogHeader>
          <DialogTitle>Призначення не знайдено</DialogTitle>
          <DialogDescription>Можливо, його вже видалено.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => rest.onTargetChange(null)}>
            Закрити
          </Button>
        </DialogFooter>
      </div>
    )
  }

  return <PrescriptionEditor detail={detail} {...rest} />
}

function toRows(detail: PrescriptionDetail | null): Row[] {
  if (!detail) return []
  return detail.items.map((item) => ({
    key: item.id,
    id: item.id,
    name: item.service?.name ?? item.custom_name ?? '',
    serviceId: item.service_id,
    unitPrice: item.unit_price,
    quantity: item.quantity,
    discountPct: item.discount_pct,
    fulfilledQty: item.fulfilled_qty,
  }))
}

function editSnapshot(rows: Row[]) {
  return JSON.stringify(rows.map((r) => [r.id ?? r.serviceId ?? `custom:${r.name}`, r.quantity, r.discountPct]))
}

function PrescriptionEditor({
  patientId,
  detail,
  onTargetChange,
}: { detail: PrescriptionDetail | null } & Omit<PrescriptionDialogProps, 'target'>) {
  const { mutate } = useSWRConfig()
  const { data: currentUser } = useSWR('current-user', getCurrentUser)
  const { data: patient } = useSWR(['patient', patientId], ([, id]) => getPatient(id))
  const { data: clinicSettings } = useSWR('clinic-settings', getClinicSettings)
  const summary = detail?.summary ?? null
  const locked = Boolean(summary?.locked_at)
  // Doctor, medical staff and manager edit everything (canEditPrescriptions); reception and the contact centre only
  // the discount of a saved prescription (canSetPrescriptionDiscount). A paid one is closed to every change.
  const mayEdit = Boolean(currentUser && canEditPrescriptions(currentUser.role))
  const mayDiscount = Boolean(currentUser && canSetPrescriptionDiscount(currentUser.role))
  const mode: PrescriptionSheetMode = locked ? 'view' : mayEdit ? 'edit' : mayDiscount && summary ? 'discount' : 'view'
  const canEdit = mode !== 'view'

  const { data: sourceDocument } = useSWR(
    summary?.source_document_id ? ['document', summary.source_document_id] : null,
    ([, docId]) => getDocument(docId),
  )

  const [rows, setRows] = useState<Row[]>(() => toRows(detail))
  const [saving, setSaving] = useState(false)
  // Print uses the saved version, so it waits until the edits are saved.
  const [savedSnapshot] = useState(() => editSnapshot(rows))
  const dirty = editSnapshot(rows) !== savedSnapshot
  const { print, printing } = usePrintPrescription()

  const canSave = canEdit && rows.length > 0 && rows.every(isPrescriptionRowValid) && !saving
  const status = summary ? prescriptionStatus(summary) : null

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  // «На всі послуги, %» and «Прибрати знижку»: one discount for every clinic service (outside ones have none).
  const setDiscountAll = (pct: number) =>
    setRows((current) => current.map((r) => (r.serviceId !== null ? { ...r, discountPct: pct } : r)))

  // A row added twice in this session gets +1 instead of a second row (catalog by id, outside the clinic by name).
  const addRow = (row: Omit<Row, 'key' | 'quantity' | 'discountPct'>) => {
    setRows((current) => {
      const same = (r: Row) =>
        !r.id &&
        (row.serviceId !== null ? r.serviceId === row.serviceId : r.serviceId === null && r.name.toLowerCase() === row.name.toLowerCase())
      const existing = current.find(same)
      if (existing) return current.map((r) => (r === existing ? { ...r, quantity: r.quantity + 1 } : r))
      return [...current, { ...row, key: crypto.randomUUID(), quantity: 1, discountPct: 0 }]
    })
  }
  const addService = (service: Service) => addRow({ name: service.name, serviceId: service.id, unitPrice: service.price })
  const addOutsideService = (name: string) => addRow({ name, serviceId: null, unitPrice: 0 })

  const refresh = () =>
    mutate((key) => Array.isArray(key) && (key[0] === 'prescriptions' || key[0] === 'prescription'))

  const handleSave = async () => {
    setSaving(true)
    try {
      if (mode === 'discount' && summary) {
        const discounts = rows.flatMap((r) => (r.id && r.serviceId !== null ? [{ id: r.id, discount_pct: r.discountPct }] : []))
        await updatePrescriptionDiscounts(summary.id, discounts)
      } else {
        const items = rows.map((r) => ({
          id: r.id,
          service_id: r.serviceId,
          custom_name: r.serviceId === null ? r.name : null,
          quantity: r.quantity,
          discount_pct: r.discountPct,
        }))
        // valid_until is an internal term (+30 days from creation), not edited here.
        if (summary) await updatePrescription(summary.id, { items })
        else await createPrescription({ patientId, items })
      }
      await refresh()
      toast.success('Призначення збережено')
      onTargetChange(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не вдалося зберегти призначення')
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicate = async () => {
    if (!summary) return
    try {
      const copy = await duplicatePrescription(summary.id)
      await refresh()
      toast.success('Створено копію призначення')
      onTargetChange(copy.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не вдалося дублювати призначення')
    }
  }

  const createdAt = summary?.created_at ?? todayIso()
  const doctorName = summary?.doctor_name ?? currentUser?.full_name ?? '—'

  return (
    <>
      {/* Fixed header: title, status, meta line and actions (secondary on the left, main on the right). */}
      <DialogHeader className="flex-row flex-wrap items-start justify-between gap-x-6 gap-y-4 pr-0 pb-6">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>{summary ? prescriptionTitle(summary.created_at) : 'Нове призначення'}</DialogTitle>
            {status && (
              <span className={`rounded-md px-2 py-0.5 text-xs leading-tight font-medium ${status.className}`}>
                {status.label}
              </span>
            )}
          </div>
          <DialogDescription>
            {summary ? `${summary.doctor_name} · створено ${formatDate(summary.created_at)}` : `Лікар: ${doctorName}`}
            {sourceDocument && summary?.source_document_id && (
              <>
                {' · '}
                <Link
                  href={`/patients/${patientId}/documents/${summary.source_document_id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {sourceDocument.title}
                </Link>
              </>
            )}
          </DialogDescription>
        </div>
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-3">
          {summary &&
            (dirty ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      tabIndex={0}
                      className="inline-flex rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    />
                  }
                >
                  <Button variant="outline" disabled aria-label="Друк. Спочатку збережіть зміни">
                    <PrinterIcon aria-hidden="true" />
                    Друк
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Спочатку збережіть зміни</TooltipContent>
              </Tooltip>
            ) : (
              <Button variant="outline" onClick={() => print(summary.id)} disabled={printing}>
                {printing ? (
                  <Loader2Icon className="animate-spin" aria-hidden="true" />
                ) : (
                  <PrinterIcon aria-hidden="true" />
                )}
                Друк
              </Button>
            ))}
          <Button variant="outline" onClick={() => onTargetChange(null)}>
            Закрити
          </Button>
          {locked && summary && mayEdit && (
            <Button onClick={handleDuplicate}>
              <CopyIcon aria-hidden="true" />
              Створити нове на основі цього
            </Button>
          )}
          {canEdit && (
            <Button onClick={handleSave} disabled={!canSave}>
              {saving ? 'Збереження…' : 'Зберегти'}
            </Button>
          )}
        </div>
      </DialogHeader>

      {/* Screen-only figures; the sheet below is what gets printed. */}
      {summary && (
        <div className="pb-6">
          <dl className="flex flex-wrap gap-x-8 gap-y-2">
            <Figure label="Оплачено" value={formatMoney(summary.paid_amount)} />
            <Figure label="Використано" value={formatMoney(summary.used_amount)} />
            <Figure label="Виконання" value={`${Math.round(summary.completion_pct)}%`} />
          </dl>
        </div>
      )}

      <SheetBackdrop variant="dialog">
        {patient && clinicSettings ? (
          <PrescriptionSheet
            clinicSettings={clinicSettings}
            patient={patient}
            doctorName={doctorName}
            date={createdAt}
            rows={rows}
            externalRecommendations={summary?.external_recommendations ?? ''}
            mode={mode}
            onRowChange={updateRow}
            onDiscountAll={setDiscountAll}
            onRowRemove={(key) => setRows((current) => current.filter((r) => r.key !== key))}
            renderAddService={(close) => (
              <ServiceAddSearch
                inputId="prescription-add-service"
                onAdd={addService}
                onAddCustom={addOutsideService}
                onDismiss={close}
                autoFocus
                placeholder="Назва або код послуги (від 3 символів)"
                className="h-line w-full rounded-sm border-0 border-b border-input bg-secondary/70 hover:bg-secondary dark:bg-secondary/70 [&_input]:h-line [&_input]:px-1 [&_input]:text-doc"
              />
            )}
          />
        ) : (
          <Skeleton className="mx-auto h-[60svh] w-full max-w-[210mm]" />
        )}
      </SheetBackdrop>
    </>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
