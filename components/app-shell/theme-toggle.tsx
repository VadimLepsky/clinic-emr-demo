'use client'

import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

// Hidden when the theme is forced (every role except the manager gets the light theme, see app/layout.tsx).
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme, forcedTheme } = useTheme()
  if (forcedTheme) return null

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label="Toggle theme"
      title="Toggle theme"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <SunIcon className="hidden size-4 dark:block" />
      <MoonIcon className="size-4 dark:hidden" />
    </Button>
  )
}
