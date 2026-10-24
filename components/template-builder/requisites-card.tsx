'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { CheckIcon } from 'lucide-react'
import { listLetterheads } from '@/lib/data'
import type { Letterhead, LetterheadKind } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { ImageUploadField } from '@/components/image-upload-field'
import { LetterheadPreview } from '@/components/document-sheet/letterhead-preview'
import { autoFilledInfo, type TemplateMeta } from './builder-utils'
import { VariableInput } from './variable-input'

const NONE = 'none'

type RequisitesCardProps = {
  meta: TemplateMeta
  onChange: (patch: Partial<TemplateMeta>) => void
}

export function RequisitesCard({ meta, onChange }: RequisitesCardProps) {
  const { data: letterheads } = useSWR('letterheads', listLetterheads)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Реквізити</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <LetterheadSelect
          kind="header"
          value={meta.header_id}
          onChange={(header_id) => onChange({ header_id })}
          letterheads={letterheads}
        />

        <ImageUploadField
          label="Банер праворуч від заголовка"
          value={meta.banner_image_url}
          onChange={(banner_image_url) => onChange({ banner_image_url })}
          hint="Реклама, запис на прийом, QR-код. Займає ~40% ширини праворуч від заголовка; дані пацієнта тоді друкуються рядками."
        />

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Дані пацієнта та лікаря</p>
          <p className="text-sm text-muted-foreground">Завжди друкуються під шапкою та заповнюються автоматично:</p>
          <ul className="flex flex-wrap gap-1.5">
            {autoFilledInfo.map((item) => (
              <li
                key={item}
                className="inline-flex items-center gap-1 rounded-md bg-status-neutral-bg px-2 py-0.5 text-xs text-status-neutral-fg"
              >
                <CheckIcon className="size-3" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <LetterheadSelect
          kind="footer"
          value={meta.footer_id}
          onChange={(footer_id) => onChange({ footer_id })}
          letterheads={letterheads}
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tb-footer">Текст підвалу</Label>
          <VariableInput
            id="tb-footer"
            multiline
            rows={3}
            placeholder="Напр., УЗ-діагностику проведено на апараті…"
            value={meta.footer_text ?? ''}
            onChange={(v) => onChange({ footer_text: v || null })}
          />
        </div>

        <ImageUploadField
          label="Логотип у підвалі"
          value={meta.footer_image_url}
          onChange={(footer_image_url) => onChange({ footer_image_url })}
          hint="Праворуч від тексту підвалу, висота ~12 мм. Напр., логотип апарата."
          previewClassName="h-20 w-full"
        />

        <div className="flex items-center gap-2">
          <Switch
            id="tb-signature"
            checked={meta.show_signature}
            onCheckedChange={(v) => onChange({ show_signature: v })}
          />
          <Label htmlFor="tb-signature">Рядок підпису лікаря</Label>
        </div>
      </CardContent>
    </Card>
  )
}

const selectCopy: Record<LetterheadKind, { label: string; none: string }> = {
  header: { label: 'Шапка', none: 'Без шапки' },
  footer: { label: 'Підвал', none: 'Без підвалу' },
}

/** «Шапка» / «Підвал»: a letterhead from the library (Налаштування → Шапки і підвали) or none, with its preview. */
function LetterheadSelect({
  kind,
  value,
  onChange,
  letterheads,
}: {
  kind: LetterheadKind
  value: string | null
  onChange: (id: string | null) => void
  letterheads: Letterhead[] | undefined
}) {
  const copy = selectCopy[kind]
  const id = `tb-letterhead-${kind}`
  if (!letterheads) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id}>{copy.label}</Label>
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }
  const options = letterheads.filter((l) => l.kind === kind)
  const items = [
    ...options.map((l) => ({ value: l.id, label: l.is_default ? `${l.name} (за замовчуванням)` : l.name })),
    { value: NONE, label: copy.none },
  ]
  const selected = options.find((l) => l.id === value)

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{copy.label}</Label>
      <Select items={items} value={value ?? NONE} onValueChange={(v) => v && onChange(v === NONE ? null : (v as string))}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected && <LetterheadPreview src={selected.image_url} alt={selected.name} />}
      <p className="text-sm text-muted-foreground">
        {kind === 'footer' && options.length === 0 ? 'Підвалів ще немає. ' : ''}
        Бланки завантажуються в{' '}
        <Link href="/settings/letterheads" className="text-primary underline-offset-4 hover:underline">
          Налаштування → Шапки і підвали
        </Link>
        .
      </p>
    </div>
  )
}
