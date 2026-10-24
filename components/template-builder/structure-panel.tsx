'use client'

import { PlusIcon } from 'lucide-react'
import type { Section } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { sectionAnchorId } from './builder-utils'
import { DragHandle, SortableList } from './sortable-list'

type StructurePanelProps = {
  sections: Section[]
  onReorder: (sections: Section[]) => void
  onAddEmpty: () => void
  onAddRecommendations: () => void
  recommendationsDisabled: boolean
}

export function scrollToSection(sectionId: string) {
  const el = document.getElementById(sectionAnchorId(sectionId))
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  el?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
}

export function StructurePanel({
  sections,
  onReorder,
  onAddEmpty,
  onAddRecommendations,
  recommendationsDisabled,
}: StructurePanelProps) {
  return (
    <nav
      aria-label="Структура документа"
      className="flex flex-col gap-3 rounded-2xl bg-card p-4 text-card-foreground lg:sticky lg:top-10 lg:max-h-[calc(100svh-5rem)] lg:overflow-y-auto dark:border dark:border-border"
    >
      <h2 className="px-2 pt-1 text-lg font-semibold">Структура документа</h2>
      {sections.length > 0 ? (
        <SortableList items={sections} getId={(s) => s.id} onReorder={onReorder} className="gap-0.5">
          {(section, handle, index) => (
            <div className="flex items-center gap-1 rounded-lg bg-card hover:bg-muted">
              <DragHandle {...handle} label={`Перемістити розділ ${section.title || index + 1}`} />
              <button
                type="button"
                onClick={() => scrollToSection(section.id)}
                className="min-w-0 flex-1 truncate rounded-lg px-1 py-2 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {section.title || <span className="text-muted-foreground">Без назви</span>}
              </button>
              <span className="pr-2 text-sm text-muted-foreground tabular-nums">{section.blocks.length}</span>
            </div>
          )}
        </SortableList>
      ) : (
        <p className="px-2 text-sm text-muted-foreground">Розділів ще немає.</p>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" className="mt-1 w-full" />}>
          <PlusIcon aria-hidden="true" />
          Новий розділ
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto min-w-60">
          <DropdownMenuItem onClick={onAddEmpty}>Порожній розділ</DropdownMenuItem>
          <DropdownMenuItem onClick={onAddRecommendations} disabled={recommendationsDisabled}>
            {'Готовий розділ «Рекомендації»'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )
}
