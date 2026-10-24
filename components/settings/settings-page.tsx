'use client'

import { usePathname } from 'next/navigation'
import { Page } from '@/components/app-shell/page'

// Settings share one layout; the price list (a wide table) uses the full width, the other sections the default one.
const WIDE_PATHS = ['/settings/services']

export function SettingsPage({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return <Page width={WIDE_PATHS.includes(pathname) ? 'wide' : 'default'}>{children}</Page>
}
