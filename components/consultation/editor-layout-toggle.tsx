'use client'

import { FileTextIcon, LayoutListIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EditorLayout } from './use-editor-layout'

const options = [
  { value: 'document', label: 'Документ', icon: FileTextIcon },
  { value: 'form', label: 'Форма', icon: LayoutListIcon },
] as const

type EditorLayoutToggleProps = {
  value: EditorLayout
  onChange: (layout: EditorLayout) => void
}

export function EditorLayoutToggle({ value, onChange }: EditorLayoutToggleProps) {
  return (
    <div role="group" aria-label="Вигляд редактора" className="inline-flex h-10 w-fit items-center rounded-lg bg-muted p-0.5">
      {options.map(({ value: option, label, icon: Icon }) => {
        const active = option === value
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-md px-3 font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
