'use client'

import type { ReactNode } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import type {
  Block,
  DocumentValues,
  FieldBlock,
  FieldValue,
  GroupBlock,
  Service,
  ServicesBlock,
  TemplateSchema,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ServicePackagesBar, ServicesTotal } from './service-packages-bar'
import type { ServicesEditContext } from './services-context'
import { LockedServicesField, LockedServicesNote, ServicesField } from './services-block'
import {
  cleanLabel,
  collectServiceBlocks,
  fieldElementId,
  fieldNames,
  interpolate,
  sectionElementId,
  type TemplateFormContext,
} from './utils'
import { ImageBlockView } from './image-block'

type PageEditLayoutProps = {
  schema: TemplateSchema
  values: DocumentValues
  onChange: (blockId: string, value: FieldValue) => void
  context: TemplateFormContext
  services: Service[]
  servicesContext: ServicesEditContext
  invalidFieldIds: string[]
  /** The prescription from this document is paid: services fields are read-only, with a note. */
  lockedServices: boolean
}

// Inline field on the A4 sheet (no frame, bg-secondary, bottom border); also used by PrescriptionSheet.
export const inlineControl =
  'rounded-sm border-0 border-b border-input bg-secondary/70 px-1 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground hover:border-ring/50 hover:bg-secondary focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 aria-invalid:border-status-danger-fg aria-invalid:bg-status-danger-bg aria-invalid:text-status-danger-fg aria-invalid:placeholder:text-status-danger-fg/70'

// Without a name the field sits right under the bar; the label stays for screen readers only.
function FieldLabel({ field, name, htmlFor, id }: { field: FieldBlock; name: string; htmlFor?: string; id: string }) {
  if (!cleanLabel(field.label)) {
    return (
      <label id={id} htmlFor={htmlFor} className="sr-only">
        {name}
      </label>
    )
  }
  return (
    <label id={id} htmlFor={htmlFor} className="font-semibold">
      {cleanLabel(field.label)}
      {field.required && (
        <span className="text-status-danger-fg" aria-hidden="true">
          *
        </span>
      )}
      :
    </label>
  )
}

type InlineFieldProps = {
  field: FieldBlock
  /** The label, or «field in section «…»» when the field has none. */
  name: string
  value: FieldValue | undefined
  onChange: (value: FieldValue) => void
  invalid: boolean
}

function InlineControl({ field, name, value, onChange, invalid }: InlineFieldProps): ReactNode {
  const controlId = fieldElementId(field.id)
  const labelId = `${controlId}-label`
  const a11y = {
    'aria-invalid': invalid || undefined,
    'aria-required': field.required || undefined,
  }

  switch (field.type) {
    case 'text':
    case 'number': {
      const text = typeof value === 'number' || typeof value === 'string' ? String(value) : ''
      return (
        <>
          <FieldLabel field={field} name={name} htmlFor={controlId} id={labelId} />
          <input
            id={controlId}
            type={field.type === 'number' ? 'number' : 'text'}
            inputMode={field.type === 'number' ? 'decimal' : undefined}
            step={field.type === 'number' ? 'any' : undefined}
            value={text}
            placeholder={field.description}
            size={Math.max(6, (text || field.description || '').length + 1)}
            onChange={(e) => {
              const raw = e.target.value
              onChange(field.type === 'number' ? (raw === '' ? '' : Number(raw)) : raw)
            }}
            className={cn(
              inlineControl,
              'h-6 max-w-full min-w-[6ch] field-sizing-content [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
              field.type === 'number' && 'tabular-nums',
            )}
            {...a11y}
          />
          {field.unit && <span className="text-muted-foreground">{field.unit}</span>}
        </>
      )
    }
    case 'select': {
      const items = (field.options ?? []).map((option) => ({
        value: option,
        label: option,
      }))
      return (
        <>
          <FieldLabel field={field} name={name} htmlFor={controlId} id={labelId} />
          <Select
            items={items}
            value={typeof value === 'string' && value ? value : null}
            onValueChange={(v) => onChange((v as string | null) ?? '')}
          >
            <SelectTrigger
              id={controlId}
              aria-labelledby={labelId}
              className={cn(
                inlineControl,
                'h-6 gap-0.5 py-0 pr-0.5 pl-1 data-[size=default]:h-6 data-placeholder:text-muted-foreground dark:bg-secondary/70 dark:hover:bg-secondary aria-invalid:ring-0 dark:aria-invalid:border-status-danger-fg dark:aria-invalid:ring-0',
              )}
              {...a11y}
            >
              <SelectValue placeholder={field.description ?? 'choose'} />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} align="start">
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )
    }
    case 'multiselect': {
      const selected = Array.isArray(value) ? (value as string[]) : []
      const toggle = (option: string) =>
        onChange(selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option])
      return (
        <>
          <FieldLabel field={field} name={name} id={labelId} />
          <DropdownMenu>
            <DropdownMenuTrigger
              id={controlId}
              aria-labelledby={labelId}
              aria-invalid={invalid || undefined}
              className={cn(
                inlineControl,
                'inline-flex min-h-6 max-w-full flex-wrap items-center gap-1 py-0.5 text-left',
              )}
            >
              {selected.length > 0 ? (
                selected.map((option) => (
                  <span key={option} className="rounded-sm bg-background px-1.5 text-xs leading-5 ring-1 ring-sheet-border">
                    {option}
                  </span>
                ))
              ) : (
                <span className="text-muted-foreground">{field.description ?? 'choose'}</span>
              )}
              <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-auto min-w-48">
              {(field.options ?? []).map((option) => (
                <DropdownMenuCheckboxItem
                  key={option}
                  checked={selected.includes(option)}
                  onCheckedChange={() => toggle(option)}
                >
                  {option}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )
    }
    case 'checkbox':
      return (
        <label className="inline-flex cursor-pointer items-center gap-2 font-semibold">
          <Checkbox
            id={controlId}
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked === true)}
            className="aria-invalid:border-status-danger-fg aria-invalid:bg-status-danger-bg"
            {...a11y}
          />
          <span className={cleanLabel(field.label) ? undefined : 'sr-only'}>
            {cleanLabel(field.label) || name}
            {field.required && (
              <span className="text-status-danger-fg" aria-hidden="true">
                *
              </span>
            )}
          </span>
        </label>
      )
    default:
      return null
  }
}

function InlineTextarea({ field, name, value, onChange, invalid }: InlineFieldProps) {
  const controlId = fieldElementId(field.id)
  return (
    <div className="flex basis-full flex-col gap-0.5 break-inside-avoid">
      <FieldLabel field={field} name={name} htmlFor={controlId} id={`${controlId}-label`} />
      <textarea
        id={controlId}
        rows={2}
        value={typeof value === 'string' ? value : ''}
        placeholder={field.description}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          inlineControl,
          'block min-h-[2lh] w-full resize-none py-0.5 leading-relaxed field-sizing-content',
        )}
        aria-invalid={invalid || undefined}
        aria-required={field.required || undefined}
      />
    </div>
  )
}

export function TemplatePageEditLayout({
  schema,
  values,
  onChange,
  context,
  services,
  servicesContext,
  invalidFieldIds,
  lockedServices,
}: PageEditLayoutProps) {
  const invalid = new Set(invalidFieldIds)
  const lastServicesBlockId = collectServiceBlocks(schema).at(-1)?.id
  const names = fieldNames(schema)

  const fieldProps = (field: FieldBlock): InlineFieldProps => ({
    field,
    name: names.get(field.id) ?? '',
    value: values[field.id],
    onChange: (v) => onChange(field.id, v),
    invalid: invalid.has(field.id),
  })

  const renderField = (field: FieldBlock) => {
    if (field.type === 'textarea') return <InlineTextarea key={field.id} {...fieldProps(field)} />
    return (
      <div key={field.id} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 break-inside-avoid">
        <InlineControl {...fieldProps(field)} />
      </div>
    )
  }

  const renderGroup = (group: GroupBlock) => {
    const fields = group.blocks.filter((b) => b.kind === 'field')
    return (
      <div
        key={group.id}
        role="group"
        aria-label={group.title}
        className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 break-inside-avoid tabular-nums"
      >
        {fields.map((field, i) =>
          field.type === 'textarea' ? (
            <InlineTextarea key={field.id} {...fieldProps(field)} />
          ) : (
            <span key={field.id} className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
              <InlineControl {...fieldProps(field)} />
              {i < fields.length - 1 && <span aria-hidden="true">;</span>}
            </span>
          ),
        )}
      </div>
    )
  }

  const renderServices = (block: ServicesBlock) =>
    lockedServices ? (
      <LockedServicesField key={block.id} block={block} value={values[block.id]} services={services} />
    ) : (
      <div key={block.id} className="flex flex-col gap-1">
        <ServicesField
          block={block}
          value={values[block.id]}
          onChange={(v) => onChange(block.id, v)}
          context={servicesContext}
        />
        {block.id === lastServicesBlockId && (
          <ServicesTotal schema={schema} values={values} catalog={servicesContext.catalog} />
        )}
      </div>
    )

  const renderBlock = (block: Block) => {
    switch (block.kind) {
      case 'field':
        return renderField(block)
      case 'group':
        return renderGroup(block)
      case 'services':
        return renderServices(block)
      case 'image':
        return <ImageBlockView key={block.id} block={block} />
      case 'static': {
        const text = interpolate(block.text, context).trim()
        return text ? (
          <p key={block.id} className="whitespace-pre-wrap">
            {text}
          </p>
        ) : null
      }
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col gap-4 text-sm leading-relaxed">
      {schema.sections.map((section) => {
        const elementId = sectionElementId(section.id)
        return (
          <section
            key={section.id}
            id={elementId}
            aria-labelledby={`${elementId}-title`}
            className="flex scroll-mt-20 flex-col gap-2"
          >
            <h2
              id={`${elementId}-title`}
              className="bg-sheet-bar px-2 py-1 text-center text-xs font-semibold tracking-wide uppercase"
            >
              {section.title}
            </h2>
            {lockedServices ? (
              section.blocks.some((b) => b.kind === 'services') && <LockedServicesNote />
            ) : (
              <ServicePackagesBar
                blocks={section.blocks.filter((b) => b.kind === 'services')}
                values={values}
                onChange={onChange}
                context={servicesContext}
              />
            )}
            {section.blocks.map(renderBlock)}
          </section>
        )
      })}
    </div>
  )
}
