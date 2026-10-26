'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { HistoryIcon } from 'lucide-react'
import { listAudit, listDocuments, listStaff } from '@/lib/data'
import type { AuditEntry } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatTime } from '@/components/documents/format'

type Filter = 'changes' | 'print' | 'all'

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'changes', label: 'Changes' },
  { value: 'print', label: 'Printing' },
]

const actionMeta: Record<AuditEntry['action'], { label: string; className: string }> = {
  create: { label: 'Created', className: 'bg-status-success-bg text-status-success-fg' },
  update: { label: 'Updated', className: 'bg-status-info-bg text-status-info-fg' },
  delete: { label: 'Deleted', className: 'bg-status-danger-bg text-status-danger-fg' },
  print: { label: 'Printed', className: 'bg-status-neutral-bg text-status-neutral-fg' },
}

const emptyMessages: Record<Filter, string> = {
  changes: 'No changes yet.',
  print: 'Nothing has been printed yet.',
  all: 'No entries yet.',
}

function matchesFilter(entry: AuditEntry, filter: Filter) {
  if (filter === 'all') return true
  const isPrint = entry.action === 'print'
  return filter === 'print' ? isPrint : !isPrint
}

function dayKey(iso: string) {
  const date = new Date(iso)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function groupByDay(entries: AuditEntry[]) {
  const groups: { key: string; at: string; entries: AuditEntry[] }[] = []
  for (const entry of entries) {
    const key = dayKey(entry.at)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.entries.push(entry)
    else groups.push({ key, at: entry.at, entries: [entry] })
  }
  return groups
}

export function HistoryTab({ patientId }: { patientId: string }) {
  const [filter, setFilter] = useState<Filter>('changes')

  const { data: entries } = useSWR(['audit', patientId], ([, id]) => listAudit(id), { revalidateOnMount: true })
  const { data: staff } = useSWR('staff', listStaff)
  const { data: documents } = useSWR(['documents', patientId, 'all'], ([, id]) => listDocuments(id))

  const staffNames = useMemo(() => new Map((staff ?? []).map((s) => [s.id, s.full_name])), [staff])
  const templateDocumentIds = useMemo(
    () => new Set((documents ?? []).filter((d) => d.kind === 'template').map((d) => d.id)),
    [documents],
  )

  const visible = useMemo(() => (entries ?? []).filter((e) => matchesFilter(e, filter)), [entries, filter])
  const groups = useMemo(() => groupByDay(visible), [visible])

  const actorName = (entry: AuditEntry) => {
    if (entry.actor_type === 'system') return 'System'
    if (entry.actor_type === 'ai') return 'AI'
    return (entry.actor_id && staffNames.get(entry.actor_id)) || '—'
  }

  const entryHref = (entry: AuditEntry) => {
    if (entry.action === 'delete' || !entry.entity_id) return null
    if (entry.entity_type === 'prescription') return `/patients/${patientId}?tab=prescriptions`
    if (entry.entity_type === 'document') {
      return templateDocumentIds.has(entry.entity_id)
        ? `/patients/${patientId}/documents/${entry.entity_id}`
        : `/patients/${patientId}?tab=documents`
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity log</CardTitle>
        <div role="group" aria-label="Filter entries" className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'h-9 rounded-full border px-4 font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                filter === f.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </CardHeader>

      {!entries ? (
        <div className="flex flex-col gap-3 px-8 py-6" aria-busy="true">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-8 py-12 text-center text-muted-foreground">
          <HistoryIcon className="size-6" aria-hidden="true" />
          {emptyMessages[filter]}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`history-day-${group.key}`} className="flex flex-col">
              <h3
                id={`history-day-${group.key}`}
                className="bg-muted/50 px-8 py-2.5 text-sm font-semibold text-muted-foreground tabular-nums"
              >
                {formatDate(group.at)}
              </h3>
              <ol className="flex flex-col divide-y divide-border">
                {group.entries.map((entry) => {
                  const meta = actionMeta[entry.action]
                  const href = entryHref(entry)
                  return (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-8 py-4 md:flex-nowrap"
                    >
                      <time dateTime={entry.at} className="w-12 shrink-0 text-muted-foreground tabular-nums">
                        {formatTime(entry.at)}
                      </time>
                      <span className="w-48 shrink-0 truncate font-medium">{actorName(entry)}</span>
                      <span
                        className={cn(
                          'inline-block shrink-0 rounded-md px-2 py-0.5 text-xs leading-tight font-medium',
                          meta.className,
                        )}
                      >
                        {meta.label}
                      </span>
                      <span className="min-w-0 flex-1 basis-full md:basis-0">{entry.description}</span>
                      {href && (
                        <Link
                          href={href}
                          className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {entry.entity_type === 'prescription' ? 'Orders' : 'Open'}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </Card>
  )
}
