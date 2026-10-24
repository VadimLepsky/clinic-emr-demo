'use client'

import { useId, useState } from 'react'
import { Loader2Icon } from 'lucide-react'
import type { PriceImportDiff, PriceImportRow } from '@/lib/data'
import type { ServiceCategory } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatMoney } from '@/components/prescriptions/format'
import { serviceCategories } from '../service-categories'

const MAX_VISIBLE = 100

type ImportDiffStepProps = {
  labName: string
  rows: PriceImportRow[]
  skipped: number
  diff: PriceImportDiff
  onBack: () => void
  onApply: (rows: PriceImportRow[], defaultCategory: ServiceCategory, deactivateIds: string[]) => Promise<void>
}

export function ImportDiffStep({ labName, rows, skipped, diff, onBack, onApply }: ImportDiffStepProps) {
  const id = useId()
  const [defaultCategory, setDefaultCategory] = useState<ServiceCategory>('lab')
  const [deactivateIds, setDeactivateIds] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nothingToDo = diff.added.length === 0 && diff.changed.length === 0 && deactivateIds.size === 0

  const toggleDeactivate = (serviceId: string, checked: boolean) =>
    setDeactivateIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(serviceId)
      else next.delete(serviceId)
      return next
    })

  const handleApply = async () => {
    setBusy(true)
    setError(null)
    try {
      await onApply(rows, defaultCategory, [...deactivateIds])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не вдалося застосувати зміни.')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>Перевірка змін</DialogTitle>
        <DialogDescription>
          Крок 3 з 3. Лабораторія «{labName.trim()}». Без змін: {diff.unchanged}
          {skipped > 0 && `. Пропущено рядків без назви або з некоректною ціною: ${skipped}`}.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex max-h-[55vh] flex-col gap-5 overflow-y-auto pr-1">
          <Section title="Нові послуги" count={diff.added.length} empty="Нових послуг немає.">
            <div className="flex flex-col gap-2 pb-1">
              <div className="flex items-center gap-2">
                <Label htmlFor={`${id}-category`} className="shrink-0 text-muted-foreground">
                  Категорія для нових:
                </Label>
                <Select
                  items={serviceCategories}
                  value={defaultCategory}
                  onValueChange={(v) => v && setDefaultCategory(v as ServiceCategory)}
                >
                  <SelectTrigger id={`${id}-category`} size="sm" className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceCategories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Rows
              items={diff.added.map((r, i) => ({
                key: `${r.code ?? ''}-${i}`,
                code: r.code,
                name: r.name,
                aside: formatMoney(r.price),
              }))}
            />
          </Section>

          <Section title="Змінилась ціна" count={diff.changed.length} empty="Змін цін немає.">
            <Rows
              items={diff.changed.map((c) => ({
                key: c.service.id,
                code: c.service.code,
                name: c.service.name,
                aside: (
                  <span>
                    <span className="text-muted-foreground line-through">{formatMoney(c.old_price)}</span>
                    {' → '}
                    <span className="font-medium">{formatMoney(c.new_price)}</span>
                  </span>
                ),
              }))}
            />
          </Section>

          <Section title="Відсутні у файлі" count={diff.missing.length} empty="Усі активні послуги є у файлі.">
            <p className="pb-1 text-sm text-muted-foreground">
              Позначте послуги, які потрібно деактивувати. За замовчуванням вони залишаються активними.
            </p>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {diff.missing.slice(0, MAX_VISIBLE).map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <Checkbox
                    id={`${id}-${s.id}`}
                    checked={deactivateIds.has(s.id)}
                    onCheckedChange={(checked) => toggleDeactivate(s.id, checked === true)}
                  />
                  <Label htmlFor={`${id}-${s.id}`} className="flex-1 font-normal">
                    {s.code && <span className="mr-2 text-muted-foreground tabular-nums">{s.code}</span>}
                    {s.name}
                  </Label>
                  <span className="tabular-nums">{formatMoney(s.price)}</span>
                </li>
              ))}
            </ul>
            <Overflow total={diff.missing.length} />
          </Section>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onBack} disabled={busy}>
          Назад
        </Button>
        <Button type="button" onClick={handleApply} disabled={busy || nothingToDo}>
          {busy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
          Застосувати зміни
        </Button>
      </DialogFooter>
    </div>
  )
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string
  count: number
  empty: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">
        {title} <span className="font-normal text-muted-foreground">({count})</span>
      </h3>
      {count === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : children}
    </section>
  )
}

function Rows({
  items,
}: {
  items: { key: string; code: string | null; name: string; aside: React.ReactNode }[]
}) {
  return (
    <>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {items.slice(0, MAX_VISIBLE).map((item) => (
          <li key={item.key} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="flex-1">
              {item.code && <span className="mr-2 text-muted-foreground tabular-nums">{item.code}</span>}
              {item.name}
            </span>
            <span className="tabular-nums">{item.aside}</span>
          </li>
        ))}
      </ul>
      <Overflow total={items.length} />
    </>
  )
}

function Overflow({ total }: { total: number }) {
  if (total <= MAX_VISIBLE) return null
  return <p className="text-sm text-muted-foreground">…та ще {total - MAX_VISIBLE}</p>
}
