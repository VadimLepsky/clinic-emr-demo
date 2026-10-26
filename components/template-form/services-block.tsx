'use client'

import { ListChecksIcon, LockIcon } from 'lucide-react'
import type { FieldValue, Service, ServicesBlock as ServicesBlockType } from '@/lib/types'
import {
  asServiceSelections,
  cleanLabel,
  fieldElementId,
  selectionKey,
  selectionText,
} from './utils'
import { formatMoney } from '@/lib/format'
import { ServicesPicker } from './services-picker'
import type { ServicesEditContext } from './services-context'

type ServicesBlockProps = {
  block: ServicesBlockType
  value: FieldValue | undefined
  services: Service[]
  mode: 'edit' | 'view'
  onChange?: (value: FieldValue) => void
  context?: ServicesEditContext
}

/** Shown instead of the bundles bar when the document's orders are paid (services are read-only). */
export function LockedServicesNote() {
  return (
    <p className="flex items-center gap-1.5 text-sm text-muted-foreground print:hidden">
      <LockIcon className="size-3.5 shrink-0" aria-hidden="true" />
      The orders have been paid — services can&apos;t be changed here.
    </p>
  )
}

/** "Label: names" as on the printed sheet; the read-only services field of the "page" edit layout. */
export function LockedServicesField({
  block,
  value,
  services,
}: {
  block: ServicesBlockType
  value: FieldValue | undefined
  services: Service[]
}) {
  const byId = new Map(services.map((s) => [s.id, s]))
  const names = asServiceSelections(value).flatMap((sel) => selectionText(sel, byId) ?? [])
  return (
    <p className="break-inside-avoid">
      <span className="font-semibold">{`${cleanLabel(block.label)}:`}</span> {names.length ? names.join(', ') : '—'}
    </p>
  )
}

/** "Label:" followed by a single multi-select; used by both the "form" and "page" edit layouts. */
export function ServicesField({
  block,
  value,
  onChange,
  context,
}: {
  block: ServicesBlockType
  value: FieldValue | undefined
  onChange: (value: FieldValue) => void
  context: ServicesEditContext
}) {
  const controlId = fieldElementId(block.id)
  const labelId = `${controlId}-label`
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 break-inside-avoid">
      <label id={labelId} htmlFor={controlId} className="text-sm font-semibold">
        {`${cleanLabel(block.label)}:`}
      </label>
      <ServicesPicker
        id={controlId}
        labelId={labelId}
        category={block.category}
        selections={asServiceSelections(value)}
        catalog={context.catalog}
        onSearch={context.search}
        onChange={onChange}
      />
    </div>
  )
}

export function ServicesBlock({ block, value, services, mode, onChange, context }: ServicesBlockProps) {
  if (mode === 'edit' && onChange && context) {
    return <ServicesField block={block} value={value} onChange={onChange} context={context} />
  }

  const selections = asServiceSelections(value)
  const byId = new Map(services.map((s) => [s.id, s]))

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <ListChecksIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-medium">{block.label}</span>
      </div>

      {selections.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-background">
          {selections.map((sel) => {
            const service = sel.serviceId !== undefined ? byId.get(sel.serviceId) : undefined
            return (
              <li key={selectionKey(sel)} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0">
                  {sel.customName ?? service?.name ?? 'Service'}
                  {sel.quantity > 1 && <span className="text-muted-foreground">{` × ${sel.quantity}`}</span>}
                </span>
                {/* Outside the clinic there is no price. */}
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {sel.customName !== undefined ? '—' : service ? formatMoney(service.price * sel.quantity) : '…'}
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
    </div>
  )
}
