import { cn } from '@/lib/utils'

// «Підкладка + аркуш»: аркуш A4 по центру на підкладці кольору полотна сторінки (bg-sheet-backdrop).
// Одна обгортка для перегляду висновку, редактора, друку призначення та попередніх переглядів у діалогах,
// щоб вони не розходились.
type SheetBackdropProps = React.ComponentProps<'div'> & {
  /** page — блок у потоці сторінки з тихою рамкою; dialog — займає все тіло діалогу й прокручується сам. */
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
