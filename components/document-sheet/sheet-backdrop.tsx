import { cn } from '@/lib/utils'

// «Backdrop + sheet»: the A4 sheet centered on a backdrop the color of the page canvas (bg-sheet-backdrop).
// One wrapper for the visit note view, the editor, orders printing and the previews in dialogs,
// so they never drift apart.
type SheetBackdropProps = React.ComponentProps<'div'> & {
  /** page — a block in the page flow with a quiet border; dialog — fills the whole dialog body and scrolls itself. */
  variant?: 'page' | 'dialog'
}

export function SheetBackdrop({ variant = 'page', className, ...props }: SheetBackdropProps) {
  return (
    <div
      data-slot="sheet-backdrop"
      className={cn(
        'bg-sheet-backdrop print:m-0 print:overflow-visible print:rounded-none print:border-0 print:bg-transparent print:p-0',
        variant === 'page'
          ? 'overflow-x-auto rounded-2xl border border-card px-4 py-8 dark:border-sheet-border'
          : '-mx-8 -mb-8 min-h-0 flex-1 overflow-auto rounded-b-2xl border-t border-sheet-border px-8 py-8',
        className,
      )}
      {...props}
    />
  )
}
