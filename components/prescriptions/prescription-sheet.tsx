import { useState, type ReactNode } from 'react'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { calcAge } from '@/lib/data'
import type { ClinicSettings, Patient } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { formatAge, formatSheetDate } from '@/lib/format'
import {
  bleedBarClass,
  DocGridOverlay,
  SheetInfoGrid,
  sheetGridClass,
  sheetPaperClass,
  subgridClass,
} from '@/components/document-sheet/grid'
import { SheetFooterImage, SheetHeader } from '@/components/document-sheet/letterhead'
import { inlineControl } from '@/components/template-form/page-edit-layout'
import { formatMoney, lineTotal, prescriptionTitle } from './format'

export type PrescriptionSheetRow = {
  key: string
  /** The catalogue service's name, or the name an External service was typed with. */
  name: string
  /** null — an External service: it goes to «External referrals» (no price). */
  serviceId: string | null
  unitPrice: number
  quantity: number
  discountPct: number
  /** Saved rows only: executed quantity, shown under the service name on screen. */
  fulfilledQty?: number
}

/**
 * view — read only. edit — services, quantities and the discount (doctor, nurse, clinic manager).
 * discount — only the discount (front desk and the contact centre).
 */
export type PrescriptionSheetMode = 'view' | 'edit' | 'discount'

type PrescriptionSheetProps = {
  /** The care plan letterhead: header and footer images (ClinicSettings, «Care plan letterhead»); null — none. */
  clinicSettings: ClinicSettings
  patient: Patient
  doctorName: string
  /** ISO date the care plan was created; the title is «Care plan from the visit on <date>». */
  date: string
  rows: PrescriptionSheetRow[]
  /** Old care plans only: the free «External» text, shown as is in the External block. */
  externalRecommendations: string
  mode?: PrescriptionSheetMode
  onRowChange?: (key: string, patch: Partial<Pick<PrescriptionSheetRow, 'quantity' | 'discountPct'>>) => void
  onRowRemove?: (key: string) => void
  /** One discount for every clinic service: «All services, %», and 0 on «Remove discount». */
  onDiscountAll?: (pct: number) => void
  /** Edit mode: the service search for the «+ Add service» row; passed in so the sheet makes no data calls. */
  renderAddService?: (close: () => void) => ReactNode
  className?: string
}

const sexLabels: Record<NonNullable<Patient['sex']>, string> = { male: 'Male', female: 'Female' }

// Columns of the 12-column sheet (AGENTS.md → Document grid): Service 7, Qty 1, Price 2, Amount 2;
// the discount, when shown, takes one column from Service. External: Service 11, Qty 1.
const span = { 1: 'col-span-1', 2: 'col-span-2', 6: 'col-span-6', 7: 'col-span-7', 9: 'col-span-9', 11: 'col-span-11' }

const DISCLAIMER =
  'This document is an estimate of the cost of services available at the clinic. ' +
  "Medical recommendations are given in the doctor's consultation note."

export function isPrescriptionRowValid(row: Pick<PrescriptionSheetRow, 'quantity' | 'discountPct'>) {
  return Number.isInteger(row.quantity) && row.quantity >= 1 && row.discountPct >= 0 && row.discountPct <= 100
}

/** «Estimated cost»: the clinic's services with their discounts (an External service has no price). */
export function prescriptionRowsTotal(rows: PrescriptionSheetRow[]) {
  return rows.reduce(
    (sum, r) =>
      sum + (r.serviceId !== null && isPrescriptionRowValid(r) ? lineTotal(r.unitPrice, r.quantity, r.discountPct) : 0),
    0,
  )
}

// A table row on the sheet's columns: one line high per line of text, a hairline under it (no border box, so the
// rows stay on the grid).
const tableRow =
  'relative col-span-full grid grid-cols-subgrid min-h-[calc(var(--doc-line)*1.5)] items-center after:absolute after:bottom-0 after:-inset-x-[calc(var(--doc-gutter)/2)] after:h-px after:bg-sheet-border'
const headRow = cn(
  'col-span-full grid grid-cols-subgrid min-h-[calc(var(--doc-line)*1.5)] items-center font-medium',
  bleedBarClass,
)
// Headers wider than their column: right-aligned ones (Price, Amount — 2 columns) fit; the one-column ones (Qty,
// Discount) are centered with their values, so the overhang stays inside the gutters and never touches a neighbour.
const numberHead = 'flex justify-end whitespace-nowrap'
const centerHead = 'flex justify-center whitespace-nowrap'
const numberInput = cn(
  inlineControl,
  'h-line w-full text-center text-doc tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
)

// The care plan as an A4 sheet: one layout for the dialog (view / edit / discount) and for print.
// Width 210mm, height follows the content (screen and print); the footer follows the information text.
export function PrescriptionSheet({
  clinicSettings,
  patient,
  doctorName,
  date,
  rows,
  externalRecommendations,
  mode = 'view',
  onRowChange,
  onRowRemove,
  onDiscountAll,
  renderAddService,
  className,
}: PrescriptionSheetProps) {
  const editServices = mode === 'edit'
  const editDiscount = mode === 'edit' || mode === 'discount'
  const clinicRows = rows.filter((r) => r.serviceId !== null)
  const outsideRows = rows.filter((r) => r.serviceId === null)
  const hasDiscount = clinicRows.some((r) => r.discountPct > 0)
  const [adding, setAdding] = useState(false)
  // No discount column by default; «Add discount» opens it (already open when a discount is set).
  const [discountOpen, setDiscountOpen] = useState(hasDiscount)
  // Read only, the column is there only when some service has a discount.
  const showDiscount = editDiscount ? discountOpen : hasDiscount

  const age = calcAge(patient.birth_date)
  const birthDate = patient.birth_date ? `${formatSheetDate(patient.birth_date)}${age === null ? '' : ` (${formatAge(age)})`}` : '—'
  const total = prescriptionRowsTotal(rows)
  const totalWithoutDiscount = prescriptionRowsTotal(rows.map((r) => ({ ...r, discountPct: 0 })))
  const header = clinicSettings.prescription_header_image_url
  const footer = clinicSettings.prescription_footer_image_url
  const external = externalRecommendations.trim()
  // «All services, %» shows the common value while every row has it.
  const commonDiscount = clinicRows.length > 0 && clinicRows.every((r) => r.discountPct === clinicRows[0].discountPct)
    ? clinicRows[0].discountPct
    : ''
  const nameSpan = showDiscount ? span[6] : span[7]

  const quantityCell = (row: PrescriptionSheetRow) =>
    editServices ? (
      <input
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        value={row.quantity}
        aria-label={`Quantity: ${row.name}`}
        aria-invalid={!Number.isInteger(row.quantity) || row.quantity < 1 || undefined}
        onChange={(e) => onRowChange?.(row.key, { quantity: Number(e.target.value) })}
        className={numberInput}
      />
    ) : (
      row.quantity
    )

  // In the sheet's right margin, so the columns stay as printed.
  const removeButton = (row: PrescriptionSheetRow) => {
    const fulfilled = (row.fulfilledQty ?? 0) > 0
    return (
      <button
        type="button"
        disabled={fulfilled}
        title={fulfilled ? 'The service has already been fulfilled' : 'Remove service'}
        aria-label={`Remove service: ${row.name}`}
        onClick={() => onRowRemove?.(row.key)}
        className="absolute top-0 -right-7 flex size-[var(--doc-line)] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 print:hidden"
      >
        <Trash2Icon className="size-3.5" aria-hidden="true" />
      </button>
    )
  }

  return (
    // Unlike the consultation note (A4 pages, footer at the bottom): as tall as its content, the footer right after
    // the information text — on screen and in print. Paper, type and bars as in the consultation note.
    <article
      className={cn(
        sheetPaperClass,
        sheetGridClass,
        'mx-auto w-[210mm] shrink-0 px-sheet-x pt-sheet-top pb-sheet-bottom shadow-md',
        className,
      )}
    >
      <DocGridOverlay />
      <div className={subgridClass}>
        {header && <SheetHeader src={header} alt="Care plan header" />}

        <SheetInfoGrid
          className="mt-line first:mt-0"
          left={[
            ['Patient', patient.full_name],
            ['Date of birth', birthDate],
            ['Sex', patient.sex ? sexLabels[patient.sex] : '—'],
          ]}
          right={[
            ['Doctor', doctorName],
            ['Date', formatSheetDate(date)],
          ]}
        />

        {/* As in the consultation note: centered, the title size, medium weight. */}
        <h1 className="mt-[calc(var(--doc-line)*1.5)] text-center text-doc-title text-balance font-medium">{prescriptionTitle(date)}</h1>

        <section className={cn('mt-[calc(var(--doc-line)*1.5)]', subgridClass)} aria-labelledby="rx-clinic">
          <h2 id="rx-clinic" className="mb-[calc(var(--doc-line)*1)] font-semibold">
            Services at the clinic
          </h2>
          <div role="table" aria-labelledby="rx-clinic" className={subgridClass}>
            <div role="row" className={headRow}>
              <span role="columnheader" className={nameSpan}>
                Service
              </span>
              <span role="columnheader" className={cn(span[1], centerHead)}>
                Qty
              </span>
              <span role="columnheader" className={cn(span[2], numberHead)}>
                Price
              </span>
              {showDiscount && (
                <span role="columnheader" className={cn(span[1], centerHead)} aria-label="Discount, %">
                  Disc., %
                </span>
              )}
              <span role="columnheader" className={cn(span[2], numberHead)}>
                Amount
              </span>
            </div>
            {showDiscount && editDiscount && (
              <div role="row" className={cn(tableRow, 'print:hidden')}>
                <label htmlFor="rx-discount-all" className={cn(span[9], 'text-right text-muted-foreground')}>
                  All services, %
                </label>
                <span className={span[1]}>
                  <input
                    id="rx-discount-all"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    inputMode="decimal"
                    value={commonDiscount}
                    onChange={(e) => onDiscountAll?.(Number(e.target.value))}
                    className={numberInput}
                  />
                </span>
              </div>
            )}
            {clinicRows.map((row) => {
              const valid = isPrescriptionRowValid(row)
              return (
                <div role="row" key={row.key} className={cn(tableRow, 'break-inside-avoid')}>
                  <span role="cell" className={nameSpan}>
                    {row.name}
                    {row.fulfilledQty !== undefined && (
                      <span className="block text-doc-small text-muted-foreground tabular-nums print:hidden">
                        {`Fulfilled ${row.fulfilledQty} of ${row.quantity}`}
                      </span>
                    )}
                  </span>
                  <span role="cell" className={cn(span[1], 'text-center tabular-nums')}>
                    {quantityCell(row)}
                  </span>
                  <span role="cell" className={cn(span[2], 'text-right tabular-nums')}>
                    {formatMoney(row.unitPrice)}
                  </span>
                  {showDiscount && (
                    <span role="cell" className={cn(span[1], 'text-center tabular-nums')}>
                      {editDiscount ? (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          inputMode="decimal"
                          value={row.discountPct}
                          aria-label={`Discount, %: ${row.name}`}
                          aria-invalid={row.discountPct < 0 || row.discountPct > 100 || undefined}
                          onChange={(e) => onRowChange?.(row.key, { discountPct: Number(e.target.value) })}
                          className={numberInput}
                        />
                      ) : (
                        row.discountPct
                      )}
                    </span>
                  )}
                  <span role="cell" className={cn(span[2], 'text-right tabular-nums')}>
                    {valid ? formatMoney(lineTotal(row.unitPrice, row.quantity, row.discountPct)) : '—'}
                  </span>
                  {editServices && removeButton(row)}
                </div>
              )
            })}
            {editServices && (
              <div role="row" className={cn(tableRow, 'print:hidden')}>
                <span role="cell" className="col-span-full">
                  {adding && renderAddService ? (
                    renderAddService(() => setAdding(false))
                  ) : (
                    <span className="flex flex-wrap items-center gap-x-2">
                      <button
                        type="button"
                        onClick={() => setAdding(true)}
                        className="inline-flex items-center gap-1 rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <PlusIcon className="size-3.5" aria-hidden="true" />
                        Add service
                      </button>
                      {rows.length === 0 && (
                        <span className="text-muted-foreground">
                          No services yet — find one by name or code.
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Two lines high with the button (screen), so the rows after it stay on the grid. */}
          <div
            className={cn(
              'mt-line flex items-start gap-gutter',
              editDiscount && clinicRows.length > 0 && 'min-h-[calc(var(--doc-line)*2)] print:min-h-0',
            )}
          >
            {editDiscount && clinicRows.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-[calc(var(--doc-line)*2)] text-doc print:hidden"
                onClick={() => {
                  if (discountOpen) onDiscountAll?.(0)
                  setDiscountOpen(!discountOpen)
                }}
              >
                {discountOpen ? 'Remove discount' : 'Add discount'}
              </Button>
            )}
            <div className="ml-auto text-right tabular-nums">
              {hasDiscount && (
                <p className="text-doc-small text-muted-foreground">{`Without discount: ${formatMoney(totalWithoutDiscount)}`}</p>
              )}
              <p className="font-semibold">{`Estimated cost: ${formatMoney(total)}`}</p>
            </div>
          </div>
        </section>

        {/* Only when it has something: External services (no price), or an old care plan's free text. */}
        {(outsideRows.length > 0 || external) && (
          <section className={cn('mt-line break-inside-avoid', subgridClass)} aria-labelledby="rx-outside">
            <h2 id="rx-outside" className="font-semibold">
              External referrals
            </h2>
            <p className="mb-[calc(var(--doc-line)*0.5)] text-doc-small text-muted-foreground">services not provided at the clinic</p>
            {outsideRows.length > 0 && (
              <div role="table" aria-labelledby="rx-outside" className={subgridClass}>
                <div role="row" className={headRow}>
                  <span role="columnheader" className={span[11]}>
                    Service
                  </span>
                  <span role="columnheader" className={cn(span[1], centerHead)}>
                    Qty
                  </span>
                </div>
                {outsideRows.map((row) => (
                  <div role="row" key={row.key} className={cn(tableRow, 'break-inside-avoid')}>
                    <span role="cell" className={span[11]}>
                      {row.name}
                    </span>
                    <span role="cell" className={cn(span[1], 'text-center tabular-nums')}>
                      {quantityCell(row)}
                    </span>
                    {editServices && removeButton(row)}
                  </div>
                ))}
              </div>
            )}
            {external && <p className="whitespace-pre-line">{external}</p>}
          </section>
        )}
      </div>

      <footer className="col-span-full flex flex-col gap-line pt-line break-inside-avoid">
        <p className="text-doc-small text-muted-foreground">{DISCLAIMER}</p>
        {footer && <SheetFooterImage src={footer} alt="Care plan footer" />}
      </footer>
    </article>
  )
}
