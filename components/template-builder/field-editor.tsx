'use client'

import { useState } from 'react'
import { PlusIcon, XIcon } from 'lucide-react'
import type { FieldBlock } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { errorElementId, errorKey, type BuilderErrors } from './builder-utils'
import { DragHandle, SortableList } from './sortable-list'
import { VariableInput } from './variable-input'

type FieldEditorProps = {
  field: FieldBlock
  onChange: (field: FieldBlock) => void
  errors: BuilderErrors
}

const AI_HINT = 'Підказка для лікаря. Пізніше її використовуватиме AI, щоб розкладати розшифровку розмови по полях'

const textViews = [
  { value: 'text', label: 'Короткий рядок' },
  { value: 'textarea', label: 'Великий текст' },
  { value: 'number', label: 'Число' },
] as const

function ErrorText({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null
}

function LabelInput({ field, onChange, errors, label }: FieldEditorProps & { label: string }) {
  const key = errorKey(field.id, 'label')
  const inputId = errorElementId(key)
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        value={field.label}
        aria-invalid={Boolean(errors[key])}
        onChange={(e) => onChange({ ...field, label: e.target.value })}
      />
      <ErrorText message={errors[key]} />
    </div>
  )
}

function DescriptionInput({ field, onChange }: Omit<FieldEditorProps, 'errors'>) {
  const inputId = `tb-desc-${field.id}`
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId}>Опис поля</Label>
      <Textarea
        id={inputId}
        rows={2}
        value={field.description}
        onChange={(e) => onChange({ ...field, description: e.target.value })}
      />
      <p className="text-sm text-muted-foreground">{AI_HINT}</p>
    </div>
  )
}

function SwitchRow({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  )
}

function RequiredSwitch({ field, onChange }: Omit<FieldEditorProps, 'errors'>) {
  return (
    <SwitchRow
      id={`tb-req-${field.id}`}
      label="Обов'язкове"
      checked={Boolean(field.required)}
      onChange={(required) => onChange({ ...field, required })}
    />
  )
}

function TextFieldEditor({ field, onChange, errors }: FieldEditorProps) {
  const defaultId = `tb-default-${field.id}`
  const changeView = (type: FieldBlock['type']) => {
    const next: FieldBlock = { ...field, type }
    if (type !== 'number') delete next.unit
    if (type === 'number') next.defaultValue = typeof field.defaultValue === 'number' ? field.defaultValue : undefined
    else next.defaultValue = typeof field.defaultValue === 'string' ? field.defaultValue : undefined
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <LabelInput field={field} onChange={onChange} errors={errors} label="Назва поля" />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`tb-view-${field.id}`}>Вигляд</Label>
          <Select items={textViews} value={field.type} onValueChange={(v) => v && changeView(v as FieldBlock['type'])}>
            <SelectTrigger id={`tb-view-${field.id}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {textViews.map((v) => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DescriptionInput field={field} onChange={onChange} />
      {field.type === 'number' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={defaultId}>Значення за замовчуванням</Label>
            <Input
              id={defaultId}
              type="number"
              inputMode="decimal"
              value={typeof field.defaultValue === 'number' ? field.defaultValue : ''}
              onChange={(e) =>
                onChange({ ...field, defaultValue: e.target.value === '' ? undefined : Number(e.target.value) })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`tb-unit-${field.id}`}>Одиниця виміру</Label>
            <Input
              id={`tb-unit-${field.id}`}
              placeholder="мм, кг, уд/хв…"
              value={field.unit ?? ''}
              onChange={(e) => onChange({ ...field, unit: e.target.value || undefined })}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={defaultId}>Значення за замовчуванням</Label>
          <VariableInput
            id={defaultId}
            multiline={field.type === 'textarea'}
            value={typeof field.defaultValue === 'string' ? field.defaultValue : ''}
            onChange={(v) => onChange({ ...field, defaultValue: v || undefined })}
          />
        </div>
      )}
      <RequiredSwitch field={field} onChange={onChange} />
    </div>
  )
}

function OptionsEditor({ field, onChange, errors }: FieldEditorProps) {
  const options = field.options ?? []
  const [keys, setKeys] = useState(() => options.map(() => crypto.randomUUID()))
  const syncedKeys =
    keys.length === options.length ? keys : options.map((_, i) => keys[i] ?? crypto.randomUUID())
  const key = errorKey(field.id, 'options')

  const update = (nextOptions: string[], nextKeys: string[]) => {
    setKeys(nextKeys)
    const next: FieldBlock = { ...field, options: nextOptions }
    if (field.type === 'select' && typeof field.defaultValue === 'string' && !nextOptions.includes(field.defaultValue))
      next.defaultValue = undefined
    if (Array.isArray(field.defaultValue)) {
      const kept = field.defaultValue.filter((v) => nextOptions.includes(v))
      next.defaultValue = kept.length ? kept : undefined
    }
    onChange(next)
  }

  const items = options.map((option, i) => ({ option, key: syncedKeys[i] }))

  return (
    <fieldset id={errorElementId(key)} className="flex flex-col gap-1.5" tabIndex={-1}>
      <legend className="mb-1.5 text-sm font-medium">
        Варіанти вибору <span className="text-destructive">*</span>
      </legend>
      <SortableList
        items={items}
        getId={(item) => item.key}
        onReorder={(next) => update(next.map((i) => i.option), next.map((i) => i.key))}
        className="gap-1.5"
      >
        {(item, handle, index) => (
          <div className="flex items-center gap-1.5">
            <DragHandle {...handle} label={`Перемістити варіант ${index + 1}`} />
            <Input
              aria-label={`Варіант ${index + 1}`}
              value={item.option}
              aria-invalid={Boolean(errors[key]) && !item.option.trim()}
              onChange={(e) => update(options.map((o, i) => (i === index ? e.target.value : o)), syncedKeys)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Видалити варіант ${index + 1}`}
              disabled={options.length <= 1}
              onClick={() =>
                update(
                  options.filter((_, i) => i !== index),
                  syncedKeys.filter((_, i) => i !== index),
                )
              }
            >
              <XIcon aria-hidden="true" />
            </Button>
          </div>
        )}
      </SortableList>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="self-start"
        onClick={() => update([...options, `Варіант ${options.length + 1}`], [...syncedKeys, crypto.randomUUID()])}
      >
        <PlusIcon aria-hidden="true" />
        Додати варіант
      </Button>
      <ErrorText message={errors[key]} />
    </fieldset>
  )
}

const NO_DEFAULT = '__none__'

function SelectFieldEditor({ field, onChange, errors }: FieldEditorProps) {
  const options = (field.options ?? []).filter((o) => o.trim())
  const multiple = field.type === 'multiselect'
  const currentDefault = Array.isArray(field.defaultValue)
    ? field.defaultValue[0]
    : typeof field.defaultValue === 'string'
      ? field.defaultValue
      : undefined
  const defaultItems = [{ value: NO_DEFAULT, label: 'Без значення' }, ...options.map((o) => ({ value: o, label: o }))]

  const setDefault = (value: string) => {
    const picked = value === NO_DEFAULT ? undefined : value
    onChange({ ...field, defaultValue: picked === undefined ? undefined : multiple ? [picked] : picked })
  }

  const toggleMultiple = (on: boolean) =>
    onChange({
      ...field,
      type: on ? 'multiselect' : 'select',
      defaultValue: currentDefault === undefined ? undefined : on ? [currentDefault] : currentDefault,
    })

  return (
    <div className="flex flex-col gap-3">
      <LabelInput field={field} onChange={onChange} errors={errors} label="Назва поля" />
      <DescriptionInput field={field} onChange={onChange} />
      <OptionsEditor field={field} onChange={onChange} errors={errors} />
      <div className="flex flex-col gap-1.5 sm:w-1/2">
        <Label htmlFor={`tb-default-${field.id}`}>Значення за замовчуванням</Label>
        <Select
          items={defaultItems}
          value={currentDefault && options.includes(currentDefault) ? currentDefault : NO_DEFAULT}
          onValueChange={(v) => v && setDefault(v as string)}
        >
          <SelectTrigger id={`tb-default-${field.id}`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {defaultItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <SwitchRow id={`tb-multi-${field.id}`} label="Можна обрати кілька" checked={multiple} onChange={toggleMultiple} />
        <RequiredSwitch field={field} onChange={onChange} />
      </div>
    </div>
  )
}

function CheckboxFieldEditor({ field, onChange, errors }: FieldEditorProps) {
  return (
    <div className="flex flex-col gap-3">
      <LabelInput field={field} onChange={onChange} errors={errors} label="Назва (текст біля чекбокса)" />
      <DescriptionInput field={field} onChange={onChange} />
      <SwitchRow
        id={`tb-default-${field.id}`}
        label="Відмічено за замовчуванням"
        checked={field.defaultValue === true}
        onChange={(v) => onChange({ ...field, defaultValue: v })}
      />
    </div>
  )
}

export function FieldEditor(props: FieldEditorProps) {
  const { type } = props.field
  if (type === 'select' || type === 'multiselect') return <SelectFieldEditor {...props} />
  if (type === 'checkbox') return <CheckboxFieldEditor {...props} />
  return <TextFieldEditor {...props} />
}

export function fieldTypeLabel(field: FieldBlock) {
  if (field.type === 'select' || field.type === 'multiselect') return 'Випадаючий список'
  if (field.type === 'checkbox') return 'Чекбокс'
  return 'Текстове поле'
}

/** «Без назви — <опис>» for a field without a name (the name is optional). */
function namelessTitle(field: FieldBlock) {
  const description = field.description.trim()
  return description ? `Без назви — ${description}` : 'Без назви'
}

/** The field's title in the builder's list as text (drag and delete buttons). */
export function fieldTitleText(field: FieldBlock) {
  return `${fieldTypeLabel(field)} · ${field.label.trim() || namelessTitle(field)}`
}

/** The field's title in the builder's list; without a name — in grey «Без назви — <опис>». */
export function FieldTitle({ field }: { field: FieldBlock }) {
  return (
    <>
      {fieldTypeLabel(field)} ·{' '}
      {field.label.trim() ? field.label : <span className="font-normal text-muted-foreground/70">{namelessTitle(field)}</span>}
    </>
  )
}

export function BlockShell({
  title,
  handle,
  actions,
  invalid,
  id,
  children,
  className,
}: {
  title: React.ReactNode
  handle: React.ReactNode
  actions: React.ReactNode
  invalid?: boolean
  id?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      id={id}
      tabIndex={id ? -1 : undefined}
      className={cn('rounded-xl border border-border bg-card', invalid && 'border-destructive', className)}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        {handle}
        <p className="flex-1 text-sm font-medium text-muted-foreground">{title}</p>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}
