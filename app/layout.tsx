import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans, Manrope } from 'next/font/google'
import { getCurrentUser } from '@/lib/data'
import { ThemeProvider } from '@/components/theme-provider'
import { AppShell } from '@/components/app-shell/app-shell'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'
import './print.css'

const manrope = Manrope({
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
})

// Documents (A4 sheets, print) are set in IBM Plex Sans; the interface stays on Manrope.
const plex = IBM_Plex_Sans({
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-plex',
})

export const metadata: Metadata = {
  title: 'Медична інформаційна система',
  description: 'Внутрішня система електронних медичних карток',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fefefe' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0e1f' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Dark theme and the theme toggle are for the manager only; every other role always gets the light theme,
  // whatever the system setting or a saved choice (AGENTS.md, rule 5).
  const user = await getCurrentUser()
  const forcedTheme = user.role === 'manager' ? undefined : 'light'

  return (
    <html lang="uk" className={`${manrope.variable} ${plex.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          forcedTheme={forcedTheme}
          disableTransitionOnChange
        >
          <AppShell>{children}</AppShell>
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
