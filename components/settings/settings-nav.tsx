'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const items = [
  { title: 'Послуги', href: '/settings/services' },
  { title: 'Пакети послуг', href: '/settings/packages' },
  { title: 'Папки', href: '/settings/folders' },
  { title: 'Шапки і підвали', href: '/settings/letterheads' },
  { title: 'Співробітники', href: '/settings/staff' },
]

export function SettingsNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Розділи налаштувань"
      className="shrink-0 rounded-2xl bg-card p-3 @5xl:w-52 @5xl:self-start dark:border dark:border-border"
    >
      <ul className="flex gap-1 overflow-x-auto @5xl:flex-col">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-10 items-center rounded-lg px-3 py-2 whitespace-nowrap transition-colors',
                  active
                    ? 'bg-secondary font-medium text-secondary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {item.title}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
