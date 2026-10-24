import Link from 'next/link'
import { ArrowLeftIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './theme-toggle'

// Контент сторінки — центрований контейнер (AGENTS.md → Visual scale → Width): до 1400px, на 2xl — до 1600px,
// щоб на широких моніторах сторінка не тиснулась ліворуч. `wide` — без верхньої межі, для сторінок-таблиць.
export const pageWidthClass = {
  default: 'mx-auto w-full max-w-[1400px] 2xl:max-w-[1600px]',
  wide: 'w-full',
} as const

export function Page({
  width = 'default',
  className,
  ...props
}: React.ComponentProps<'div'> & { width?: keyof typeof pageWidthClass }) {
  return <div className={cn('flex flex-col gap-6', pageWidthClass[width], className)} {...props} />
}

type PageHeaderProps = {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  back?: { href: string; label: string }
  titleId?: string
  className?: string
}

// Заголовок сторінки text-3xl: стрілка «назад», заголовок, дії та перемикач теми в одному рядку,
// по центру за висотою. Нічого над заголовком, тож він починається на тій самій висоті, що й на головній.
// Від заголовка (а якщо є опис — від опису) до контенту 60px: pb-9 (36px) + gap-6 (24px) у Page.
export function PageHeader({ title, description, actions, back, titleId, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-1 pb-9', className)}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:flex-nowrap">
        <div className="flex min-w-0 items-center gap-2">
          {back && <BackButton href={back.href} label={back.label} />}
          <h1 id={titleId} className="min-w-0 text-3xl font-semibold text-balance">
            {title}
          </h1>
        </div>
        {/* -my-0.5: the 40px controls overhang the 36px title line instead of pushing it down. empty:hidden: with no
            actions and no theme toggle (non-managers) the empty box leaves no gap or wrapped empty row. */}
        <div className="-my-0.5 ml-auto flex shrink-0 flex-wrap items-center gap-2 empty:hidden">
          {actions}
          <ThemeToggle />
        </div>
      </div>
      {description && <div className="text-base text-muted-foreground">{description}</div>}
    </header>
  )
}

// -ml-2.5 lines the arrow up with the content edge; the label is the accessible name and the hover hint.
function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      nativeButton={false}
      render={<Link href={href} />}
      aria-label={label}
      title={label}
      className="-my-0.5 -ml-2.5 shrink-0 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon className="size-5" aria-hidden="true" />
    </Button>
  )
}
