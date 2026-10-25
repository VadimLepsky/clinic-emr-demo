import type { ReactElement } from 'react'
import Link from 'next/link'
import { EyeIcon, Loader2Icon, PrinterIcon, Trash2Icon, UserRoundIcon } from 'lucide-react'
import type { PrescriptionSummary } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { prescriptionStatus } from './format'

/** Short status for lists and home pages; the full wording is in the title (and in the dialog header badge). */
export function PrescriptionStatusBadge({ summary }: { summary: PrescriptionSummary }) {
  const status = prescriptionStatus(summary)
  return (
    <span
      title={status.label !== status.shortLabel ? status.label : undefined}
      className={`inline-block rounded-md px-2 py-1 text-xs leading-tight font-medium whitespace-nowrap ${status.className}`}
    >
      {status.shortLabel}
    </span>
  )
}

export function CompletionBar({ pct, label }: { pct: number; label: string }) {
  const rounded = Math.round(pct)
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm tabular-nums">{rounded}%</span>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
        className="h-1 w-full min-w-16 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full bg-primary" style={{ width: `${rounded}%` }} />
      </div>
    </div>
  )
}

type PrescriptionRowActionsProps = {
  /** Who/what the row is about, for the accessible names («View: …»). */
  subject: string
  /** «View»: opens the orders dialog. */
  onView?: () => void
  /** «Patient record»: where the row itself opens the orders (front desk, contact center), this link replaces
   *  «View». */
  patientHref?: string
  /** Prints in place (usePrintPrescription), no separate print page. */
  onPrint: () => void
  /** This row's sheet is being prepared for print: spinner, disabled. */
  printing?: boolean
  /** Another print is being prepared. */
  printDisabled?: boolean
  /** Manager only: soft delete behind the confirmation dialog. */
  onDelete?: () => void
}

// Row actions in prescription tables: icon buttons in one row on the right edge, labels in tooltips.
export function PrescriptionRowActions({
  subject,
  onView,
  patientHref,
  onPrint,
  printing = false,
  printDisabled = false,
  onDelete,
}: PrescriptionRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      {patientHref && (
        <IconAction
          label="Patient record"
          subject={subject}
          button={<Button variant="ghost" size="icon" nativeButton={false} render={<Link href={patientHref} />} />}
        >
          <UserRoundIcon aria-hidden="true" />
        </IconAction>
      )}
      {onView && (
        <IconAction label="View" subject={subject} button={<Button variant="ghost" size="icon" onClick={onView} />}>
          <EyeIcon aria-hidden="true" />
        </IconAction>
      )}
      <IconAction
        label="Print"
        subject={subject}
        button={<Button variant="ghost" size="icon" onClick={onPrint} disabled={printing || printDisabled} />}
      >
        {printing ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : <PrinterIcon aria-hidden="true" />}
      </IconAction>
      {onDelete && (
        <IconAction
          label="Delete"
          subject={subject}
          button={
            <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive" />
          }
        >
          <Trash2Icon aria-hidden="true" />
        </IconAction>
      )}
    </div>
  )
}

function IconAction({
  label,
  subject,
  button,
  children,
}: {
  label: string
  subject: string
  button: ReactElement
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={button} aria-label={`${label}: ${subject}`}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
