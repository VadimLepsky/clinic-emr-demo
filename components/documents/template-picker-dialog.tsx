'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { ChevronRightIcon, FileTextIcon, SearchIcon } from 'lucide-react'
import { canCreateKind, getCurrentUser, listTemplates } from '@/lib/data'
import type { Template, TemplateKind } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

/** Search appears only when the list is longer than this. */
const SEARCH_THRESHOLD = 6

const kindGroups: { kind: TemplateKind; label: string }[] = [
  { kind: 'consultation', label: 'Консультації' },
  { kind: 'ultrasound', label: 'УЗД' },
  { kind: 'lab', label: 'Аналізи' },
  { kind: 'certificate', label: 'Довідки' },
  { kind: 'other', label: 'Інше' },
]

const sameSpecialty = (a: string | null, b: string | null) =>
  Boolean(a?.trim() && b?.trim() && a.trim().toLowerCase() === b.trim().toLowerCase())

export const newDocumentHref = (patientId: string, templateId: string) =>
  `/patients/${patientId}/documents/new?template=${templateId}`

type TemplatePickerProps = {
  patientId: string
  /** Only these types (e.g. «Додати документ» → УЗД); all creatable types when omitted. */
  kinds?: TemplateKind[]
  /** Called after a template is picked, before the page changes (closes the dialog). */
  onPicked?: () => void
}

/**
 * Active templates the current user may fill in (canCreateKind), grouped by type, «Ваша спеціальність» first.
 * Nothing is preselected, even with one template. Picking opens the new document with that template.
 * Items are buttons (router.push), not links: the unsaved-changes guard of an open editor intercepts link
 * clicks, and «Змінити шаблон» has already asked.
 */
export function TemplatePicker({ patientId, kinds, onPicked }: TemplatePickerProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const { data: templates } = useSWR('templates', listTemplates)
  const { data: user } = useSWR('current-user', getCurrentUser)

  if (!templates || !user) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    )
  }

  const available = templates.filter(
    (t) => t.is_active && canCreateKind(user.role, t.kind) && (!kinds || kinds.includes(t.kind)),
  )
  if (available.length === 0) {
    return <p className="text-muted-foreground">Немає активних шаблонів, які ви можете заповнити.</p>
  }

  const search = query.trim().toLowerCase()
  const shown = search ? available.filter((t) => t.name.toLowerCase().includes(search)) : available
  const byName = (a: Template, b: Template) => a.name.localeCompare(b.name, 'uk')
  const groups = kindGroups
    .map((group) => {
      const inKind = shown.filter((t) => t.kind === group.kind).sort(byName)
      return {
        ...group,
        own: inKind.filter((t) => sameSpecialty(t.specialty, user.specialty)),
        others: inKind.filter((t) => !sameSpecialty(t.specialty, user.specialty)),
      }
    })
    .filter((group) => group.own.length + group.others.length > 0)

  const pick = (template: Template) => {
    onPicked?.()
    router.push(newDocumentHref(patientId, template.id))
  }

  return (
    <div className="flex min-h-0 flex-col gap-4">
      {available.length > SEARCH_THRESHOLD && (
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук за назвою"
            aria-label="Пошук шаблону за назвою"
            className="pl-10"
          />
        </div>
      )}

      <div className="-mx-1 flex max-h-[min(60vh,32rem)] flex-col gap-5 overflow-y-auto px-1">
        {groups.length === 0 ? (
          <p className="text-muted-foreground">За запитом «{query.trim()}» шаблонів немає.</p>
        ) : (
          groups.map((group) => (
            <section key={group.kind} aria-label={group.label} className="flex flex-col gap-2">
              {/* The type heading only helps when there is more than one type. */}
              {groups.length > 1 && <h3 className="font-semibold">{group.label}</h3>}
              {group.own.length > 0 && (
                <TemplateList title="Ваша спеціальність" templates={group.own} onPick={pick} />
              )}
              {group.others.length > 0 && (
                <TemplateList title={group.own.length > 0 ? 'Інші' : undefined} templates={group.others} onPick={pick} />
              )}
            </section>
          ))
        )}
      </div>
    </div>
  )
}

function TemplateList({
  title,
  templates,
  onPick,
}: {
  title?: string
  templates: Template[]
  onPick: (template: Template) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {title && <p className="text-sm text-muted-foreground">{title}</p>}
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {templates.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              onClick={() => onPick(template)}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                <FileTextIcon className="size-4" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{template.name}</span>
                {template.specialty && <span className="text-sm text-muted-foreground">{template.specialty}</span>}
              </span>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

type TemplatePickerDialogProps = {
  /** The dialog is open while a patient is set. */
  patientId: string | null
  kinds?: TemplateKind[]
  onClose: () => void
}

/** «Оберіть шаблон»: every way into a new document (visits, «Додати документ», «Змінити шаблон») goes through it. */
export function TemplatePickerDialog({ patientId, kinds, onClose }: TemplatePickerDialogProps) {
  // Keeps the last patient while the dialog animates out, so its content doesn't vanish mid-close.
  const [shownPatientId, setShownPatientId] = useState(patientId)
  if (patientId && patientId !== shownPatientId) setShownPatientId(patientId)
  const popupRef = useRef<HTMLDivElement>(null)

  return (
    <Dialog open={patientId !== null} onOpenChange={(open) => !open && onClose()}>
      {/* Focus goes to the search, or to the dialog itself — never to the first template, which would look
          preselected when opened from the keyboard. */}
      <DialogContent
        ref={popupRef}
        initialFocus={() => popupRef.current?.querySelector<HTMLElement>('input[type=search]') ?? popupRef.current}
      >
        <DialogHeader>
          <DialogTitle>Оберіть шаблон</DialogTitle>
        </DialogHeader>
        {shownPatientId && <TemplatePicker patientId={shownPatientId} kinds={kinds} onPicked={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
