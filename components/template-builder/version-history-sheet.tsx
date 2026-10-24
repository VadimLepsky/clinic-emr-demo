'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ChevronRightIcon } from 'lucide-react'
import { getTemplatePreviewContext, listLetterheads, listTemplateVersions, type TemplateVersionInfo } from '@/lib/data'
import type { Patient, Staff } from '@/lib/types'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { DocumentSheet } from '@/components/document-sheet/document-sheet'
import { SheetBackdrop } from '@/components/document-sheet/sheet-backdrop'
import { useSelectedServices } from '@/components/consultation/use-selected-services'
import { formatDateTime } from '@/components/documents/format'
import { getInitialValues } from '@/components/template-form/utils'
import type { TemplateMeta } from './builder-utils'

type VersionHistorySheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateId: string | undefined
  meta: TemplateMeta
}

function VersionPreviewBody({
  info,
  meta,
  patient,
  doctor,
}: {
  info: TemplateVersionInfo
  meta: TemplateMeta
  patient: Patient
  doctor: Staff
}) {
  const isoDate = info.version.created_at.slice(0, 10)
  const values = getInitialValues(info.version.schema, { patient, doctor, documentDate: isoDate, documentNumber: null })
  const services = useSelectedServices(info.version.schema, values)
  const { data: letterheads = [] } = useSWR('letterheads', listLetterheads)

  return (
    <DocumentSheet
      mode="view"
      title={meta.name.trim() || 'Без назви'}
      schema={info.version.schema}
      values={values}
      patient={patient}
      doctor={doctor}
      documentDate={isoDate}
      documentNumber="КВ-000000"
      letterheads={letterheads}
      requisites={meta}
      services={services}
    />
  )
}

export function VersionHistorySheet({ open, onOpenChange, templateId, meta }: VersionHistorySheetProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: versions } = useSWR(
    open && templateId ? ['template-versions', templateId] : null,
    ([, id]) => listTemplateVersions(id),
  )
  const { data: context } = useSWR(
    selectedId ? ['template-preview-context', meta.specialty ?? ''] : null,
    ([, s]) => getTemplatePreviewContext(s || null),
  )

  const selected = versions?.find((v) => v.version.id === selectedId) ?? null

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Історія версій</SheetTitle>
            <SheetDescription>Оберіть версію, щоб переглянути її у режимі читання.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-8">
            {!templateId ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                Шаблон ще не збережено — версій немає.
              </p>
            ) : !versions ? (
              <div className="flex flex-col gap-2" aria-busy="true">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : versions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                Версій поки немає.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {versions.map((info) => (
                  <li key={info.version.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(info.version.id)}
                      className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          {`Версія ${info.version.version}`}
                          {info.is_current && (
                            <span className="rounded-md bg-status-success-bg px-2 py-0.5 text-xs leading-tight font-medium text-status-success-fg">
                              Поточна
                            </span>
                          )}
                        </span>
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {formatDateTime(info.version.created_at)}
                        </span>
                        <span className="truncate text-sm text-muted-foreground">
                          {`Зберіг: ${info.saved_by ?? '—'}`}
                        </span>
                      </span>
                      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={selected !== null} onOpenChange={(next) => !next && setSelectedId(null)}>
        <DialogContent className="flex max-h-[92svh] flex-col gap-6 sm:max-w-[min(64rem,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>{selected ? `Версія ${selected.version.version}` : 'Версія'}</DialogTitle>
            <DialogDescription>
              {selected
                ? `${formatDateTime(selected.version.created_at)} · Зберіг: ${selected.saved_by ?? '—'}. Лише перегляд — тестові дані пацієнта.`
                : 'Лише перегляд'}
            </DialogDescription>
          </DialogHeader>
          <SheetBackdrop variant="dialog">
            {selected && context ? (
              <VersionPreviewBody
                key={selected.version.id}
                info={selected}
                meta={meta}
                patient={context.patient}
                doctor={context.doctor}
              />
            ) : (
              <Skeleton className="mx-auto h-[60svh] w-full max-w-[210mm]" />
            )}
          </SheetBackdrop>
        </DialogContent>
      </Dialog>
    </>
  )
}
