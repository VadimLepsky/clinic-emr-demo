'use client'

import { FolderIcon, FolderOpenIcon, LayersIcon } from 'lucide-react'
import type { Folder } from '@/lib/types'
import { cn } from '@/lib/utils'

type FolderListProps = {
  folders: Folder[]
  counts: Record<string, number>
  activeFolderId: string | null
  onSelect: (folderId: string | null) => void
}

export function FolderList({ folders, counts, activeFolderId, onSelect }: FolderListProps) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)

  return (
    <nav aria-label="Document folders">
      <ul className="flex gap-1 overflow-x-auto @5xl:flex-col @5xl:overflow-visible">
        <FolderItem
          label="All documents"
          count={total}
          active={activeFolderId === null}
          onClick={() => onSelect(null)}
          icon={<LayersIcon className="size-4 shrink-0" aria-hidden="true" />}
        />
        {folders.map((folder) => {
          const active = activeFolderId === folder.id
          const Icon = active ? FolderOpenIcon : FolderIcon
          return (
            <FolderItem
              key={folder.id}
              label={folder.name}
              count={counts[folder.id] ?? 0}
              active={active}
              onClick={() => onSelect(folder.id)}
              icon={<Icon className="size-4 shrink-0" aria-hidden="true" />}
            />
          )
        })}
      </ul>
    </nav>
  )
}

function FolderItem({
  label,
  count,
  active,
  onClick,
  icon,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  icon: React.ReactNode
}) {
  return (
    <li className="shrink-0">
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'true' : undefined}
        className={cn(
          'flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
          'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          active ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground',
        )}
      >
        <span className={cn(active ? 'text-primary' : 'text-muted-foreground')}>{icon}</span>
        <span className="whitespace-nowrap @5xl:flex-1 @5xl:whitespace-normal">{label}</span>
        <span className={cn('text-sm tabular-nums', count === 0 ? 'text-muted-foreground/70' : 'text-muted-foreground')}>
          ({count})
        </span>
      </button>
    </li>
  )
}
