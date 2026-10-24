'use client'

import { CheckIcon } from 'lucide-react'
import type { FieldBlock as FieldBlockType, FieldValue } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fieldElementId, formatFieldValue } from './utils'

type FieldBlockProps = {
  field: FieldBlockType
  /** The label, or «поле в розділі «…»» when the field has none (then for screen readers only). */
  name?: string
  value: FieldValue | undefined
  onChange: (value: FieldValue) => void
  mode: 'edit' | 'view'
  invalid?: boolean
}

function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden="true">
      {' *'}
    </span>
  )
}

export function FieldBlock({ field, name, value, onChange, mode, invalid = false }: FieldBlockProps) {
  const named = Boolean(field.label.trim())
  const controlId = fieldElementId(field.id)
  const labelId = `${controlId}-label`
  const helpId = `${controlId}-help`
  const errorId = `${controlId}-error`

  if (mode === 'view') {
    const display = formatFieldValue(field, value)
    return (
      <div className="flex flex-col gap-1">
        {named && <span className="text-sm font-medium text-muted-foreground">{field.label}</span>}
        <p className={cn('text-sm whitespace-pre-wrap', display ? 'text-foreground' : 'text-muted-foreground')}>
          {display ?? '—'}
        </p>
      </div>
    )
  }

  const describedBy = [field.description ? helpId : null, invalid ? errorId : null].filter(Boolean).join(' ') || undefined
  const a11y = {
    'aria-invalid': invalid || undefined,
    'aria-required': field.required || undefined,
    'aria-describedby': describedBy,
  }

  const helper = (
    <>
      {field.description && (
        <p id={helpId} className="text-sm text-muted-foreground">
          {field.description}
        </p>
      )}
      {invalid && (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {"Обов'язкове поле"}
        </p>
      )}
    </>
  )

  if (field.type === 'checkbox') {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium">
          <Checkbox
            id={controlId}
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked === true)}
            {...a11y}
          />
          <span className={named ? undefined : 'sr-only'}>
            {named ? field.label : name}
            {field.required && <RequiredMark />}
          </span>
        </label>
        {helper}
      </div>
    )
  }

  const label = named ? (
    <label id={labelId} htmlFor={controlId} className="text-sm font-medium">
      {field.label}
      {field.required && <RequiredMark />}
    </label>
  ) : (
    <label id={labelId} htmlFor={controlId} className="sr-only">
      {name}
    </label>
  )

  let control: React.ReactNode
  switch (field.type) {
    case 'textarea':
      control = (
        <Textarea
          id={controlId}
          value={typeof value === 'string' ? value : ''}
          placeholder={field.description}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-20"
          {...a11y}
        />
      )
      break
    case 'number':
    case 'text':
      control = (
        <div className="flex items-center gap-2">
          <Input
            id={controlId}
            type={field.type === 'number' ? 'number' : 'text'}
            inputMode={field.type === 'number' ? 'decimal' : undefined}
            step={field.type === 'number' ? 'any' : undefined}
            value={typeof value === 'number' || typeof value === 'string' ? value : ''}
            placeholder={field.type === 'text' ? field.description : undefined}
            onChange={(e) => {
              const raw = e.target.value
              onChange(field.type === 'number' ? (raw === '' ? '' : Number(raw)) : raw)
            }}
            className="min-w-0 flex-1 tabular-nums"
            {...a11y}
          />
          {field.unit && <span className="shrink-0 text-sm text-muted-foreground">{field.unit}</span>}
        </div>
      )
      break
    case 'select': {
      const items = (field.options ?? []).map((option) => ({ value: option, label: option }))
      control = (
        <Select
          items={items}
          value={typeof value === 'string' && value ? value : null}
          onValueChange={(v) => onChange((v as string | null) ?? '')}
        >
          <SelectTrigger id={controlId} className="w-full" {...a11y}>
            <SelectValue placeholder="Оберіть значення" />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
      break
    }
    case 'multiselect': {
      const selected = Array.isArray(value) ? (value as string[]) : []
      const toggle = (option: string) =>
        onChange(selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option])
      control = (
        <div
          id={controlId}
          role="group"
          tabIndex={-1}
          aria-labelledby={labelId}
          className={cn('flex flex-wrap gap-2 rounded-lg outline-none', invalid && 'ring-3 ring-destructive/20')}
          {...a11y}
        >
          {(field.options ?? []).map((option) => {
            const isOn = selected.includes(option)
            return (
              <button
                key={option}
                type="button"
                aria-pressed={isOn}
                onClick={() => toggle(option)}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  isOn
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:bg-muted',
                )}
              >
                {isOn && <CheckIcon className="size-3.5" aria-hidden="true" />}
                {option}
              </button>
            )
          })}
        </div>
      )
      break
    }
    default:
      return null
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label}
      {control}
      {helper}
    </div>
  )
}
