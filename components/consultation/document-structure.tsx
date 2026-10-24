'use client'

import { useEffect, useState } from 'react'
import type { Section } from '@/lib/types'
import { cn } from '@/lib/utils'
import { sectionElementId } from '@/components/template-form/utils'

function useActiveSection(sectionIds: string[]) {
  const [activeId, setActiveId] = useState<string | null>(sectionIds[0] ?? null)
  const key = sectionIds.join('|')

  useEffect(() => {
    const ids = key ? key.split('|') : []
    const visible = new Map<string, boolean>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting)
        const first = ids.find((id) => visible.get(sectionElementId(id)))
        if (first) setActiveId(first)
      },
      { rootMargin: '-64px 0px -55% 0px' },
    )
    for (const id of ids) {
      const el = document.getElementById(sectionElementId(id))
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [key])

  return [activeId, setActiveId] as const
}

export function DocumentStructure({ sections }: { sections: Section[] }) {
  const [activeId, setActiveId] = useActiveSection(sections.map((s) => s.id))

  const scrollTo = (id: string) => {
    setActiveId(id)
    document.getElementById(sectionElementId(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav aria-label="Document outline" className="rounded-2xl bg-card p-4 dark:border dark:border-border">
      <p className="px-3 pb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Document outline
      </p>
      <ol className="flex flex-col gap-0.5">
        {sections.map((section, index) => {
          const isActive = section.id === activeId
          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => scrollTo(section.id)}
                aria-current={isActive ? 'location' : undefined}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  isActive ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span className="w-5 shrink-0 text-sm tabular-nums">{index + 1}</span>
                <span className="min-w-0 truncate">{section.title}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
