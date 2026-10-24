import { Fragment, type ReactNode } from 'react'
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
import { sectionBarClass, subgridClass } from '@/components/document-sheet/grid'
import type { SheetAtom } from '@/components/document-sheet/paged-sheet'
import { ImageBlockView } from './image-block'
import { asServiceSelections, cleanLabel, formatFieldValue, interpolate, selectionText, type TemplateFormContext } from './utils'

type PageLayoutProps = {
  schema: TemplateSchema
  values: DocumentValues
  context: TemplateFormContext
  services: Service[]
  /** Template preview: show where values go (skeleton bars) instead of values; nothing is hidden. */
  mock?: boolean
}

type FieldEntry = { label: string; text: string | null; multiline: boolean }

function getFieldEntry(field: FieldBlock, value: FieldValue | undefined): FieldEntry | null {
  const label = cleanLabel(field.label)
  // A checked checkbox prints its name; without one there is nothing to print.
  if (field.type === 'checkbox') return value === true && label ? { label, text: null, multiline: false } : null
  const text = formatFieldValue(field, value)
  return text ? { label, text, multiline: field.type === 'textarea' } : null
}

// One list per field: services outside the clinic go with the rest, marked after the name.
function getServiceNames(value: FieldValue | undefined, byId: Map<string, Service>): string[] {
  return asServiceSelections(value).flatMap((sel) => selectionText(sel, byId) ?? [])
}

// A field without a name prints only its value: no label, no colon, no empty line.
function EntryText({ entry }: { entry: FieldEntry }) {
  if (!entry.label) return <>{entry.text}</>
  if (entry.text === null) return <span className="font-semibold">{entry.label}</span>
  return (
    <>
      <span className="font-semibold">{`${entry.label}:`}</span> {entry.text}
    </>
  )
}

// ---- Mock (template preview): no invented values. Free-text values become skeleton bars;
// choices, units, labels and static text are real — they are part of the template.

function Bar({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('inline-block h-[1em] rounded bg-muted align-middle', className)} />
}

function mockChoice(field: FieldBlock): string | null {
  const preset = field.defaultValue
  if (field.type === 'multiselect' && Array.isArray(preset) && preset.length) return preset.join(', ')
  if (typeof preset === 'string' && preset.trim()) return preset.trim()
  return field.options?.find((option) => option.trim()) ?? null
}

/** Inline mock value after «Label:»; `compact` is for several fields sharing one line (groups). */
function MockValue({ field, compact = false }: { field: FieldBlock; compact?: boolean }) {
  const textBar = <Bar className={compact ? 'w-24' : 'w-[40%]'} />
  switch (field.type) {
    case 'number':
      return (
        <>
          <Bar className="w-10" />
          {field.unit && ` ${field.unit}`}
        </>
      )
    case 'select':
    case 'multiselect':
      return <>{mockChoice(field) ?? textBar}</>
    default:
      return textBar
  }
}

function MockField({ field, hideLabel: hide = false }: { field: FieldBlock; hideLabel?: boolean }) {
  const label = cleanLabel(field.label)
  const hideLabel = hide || !label
  if (field.type === 'checkbox') {
    return (
      <p className="break-inside-avoid">
        <span className="font-semibold">{label}</span>
      </p>
    )
  }
  if (field.type === 'textarea') {
    return (
      <div className="break-inside-avoid">
        {!hideLabel && <p className="font-semibold">{`${label}:`}</p>}
        {['w-full', 'w-[85%]', 'w-[60%]'].map((width) => (
          <p key={width}>
            <Bar className={width} />
          </p>
        ))}
      </div>
    )
  }
  if (hideLabel) {
    return (
      <p className="break-inside-avoid">
        <MockValue field={field} />
      </p>
    )
  }
  return (
    <p className="break-inside-avoid">
      <span className="font-semibold">{`${label}:`}</span> <MockValue field={field} />
    </p>
  )
}

function MockGroup({ group }: { group: GroupBlock }) {
  const fields = group.blocks.filter((b) => b.kind === 'field')
  if (fields.length === 0) return null
  return (
    <p className="break-inside-avoid tabular-nums">
      {fields.map((field, i) => (
        <Fragment key={field.id}>
          {i > 0 && '; '}
          {field.type === 'checkbox' ? (
            <span className="font-semibold">{cleanLabel(field.label)}</span>
          ) : cleanLabel(field.label) ? (
            <>
              <span className="font-semibold">{`${cleanLabel(field.label)}:`}</span> <MockValue field={field} compact />
            </>
          ) : (
            <MockValue field={field} compact />
          )}
        </Fragment>
      ))}
    </p>
  )
}

function MockServices({ block }: { block: ServicesBlock }) {
  return (
    <p className="break-inside-avoid">
      <span className="font-semibold">{`${cleanLabel(block.label)}:`}</span>{' '}
      <span className="inline-flex flex-wrap gap-x-1.5 align-middle">
        <Bar className="w-28 rounded-full" />
        <Bar className="w-20 rounded-full" />
        <Bar className="w-24 rounded-full" />
      </span>
    </p>
  )
}

/** The sections as sheet atoms: a bar each, then its fields — the A4 sheet lays them out page by page. */
export function templatePageAtoms({ schema, values, context, services, mock = false }: PageLayoutProps): SheetAtom[] {
  const servicesById = new Map(services.map((s) => [s.id, s]))

  // hideLabel: the section's only field, labelled like the section — the bar already says it.
  const renderField = (field: FieldBlock, hideLabel = false): ReactNode => {
    if (mock) return <MockField key={field.id} field={field} hideLabel={hideLabel} />
    const entry = getFieldEntry(field, values[field.id])
    if (!entry) return null
    if ((hideLabel || !entry.label) && entry.text !== null) {
      return (
        <p key={field.id} className="whitespace-pre-wrap">
          {entry.text}
        </p>
      )
    }
    if (entry.multiline) {
      return (
        <div key={field.id}>
          <p className="font-semibold break-inside-avoid break-after-avoid">{`${entry.label}:`}</p>
          <p className="whitespace-pre-wrap">{entry.text}</p>
        </div>
      )
    }
    return (
      <p key={field.id} className="whitespace-pre-wrap break-inside-avoid">
        <EntryText entry={entry} />
      </p>
    )
  }

  const renderGroup = (group: GroupBlock): ReactNode => {
    if (mock) return <MockGroup key={group.id} group={group} />
    const entries = group.blocks
      .filter((b) => b.kind === 'field')
      .map((field) => getFieldEntry(field, values[field.id]))
      .filter((e): e is FieldEntry => e !== null)
    if (entries.length === 0) return null
    return (
      <p key={group.id} className="whitespace-pre-wrap break-inside-avoid tabular-nums">
        {entries.map((entry, i) => (
          <Fragment key={entry.label}>
            {i > 0 && '; '}
            <EntryText entry={entry} />
          </Fragment>
        ))}
      </p>
    )
  }

  const renderDataBlock = (block: Block, hideLabel: boolean): ReactNode => {
    switch (block.kind) {
      case 'field':
        return renderField(block, hideLabel)
      case 'group':
        return renderGroup(block)
      case 'services': {
        if (mock) return <MockServices key={block.id} block={block} />
        const names = getServiceNames(values[block.id], servicesById)
        if (names.length === 0) return null
        return (
          <p key={block.id} className="break-inside-avoid">
            <span className="font-semibold">{`${cleanLabel(block.label)}:`}</span> {names.join(', ')}
          </p>
        )
      }
      default:
        return null
    }
  }

  // View and print only (filling in uses page-edit-layout), on the document grid (AGENTS.md → Document grid):
  // one line before a section bar, the bar one and a half lines, half a line after it and between fields.
  const atoms: SheetAtom[] = []
  for (const section of schema.sections) {
    // Static text and images are part of the template, not values: they never keep a section on the sheet alone.
    const hasDataBlocks = section.blocks.some((b) => b.kind !== 'static' && b.kind !== 'image')
    const sectionTitle = cleanLabel(section.title)
    const only = section.blocks.length === 1 ? section.blocks[0] : undefined
    const labelRepeatsTitle =
      only?.kind === 'field' &&
      only.type !== 'checkbox' &&
      cleanLabel(only.label).toLowerCase() === sectionTitle.toLowerCase()
    const rendered = section.blocks.map((block) => {
      if (block.kind === 'image') {
        return block.src ? { key: block.id, node: <ImageBlockView block={block} snap />, isData: false } : null
      }
      if (block.kind === 'static') {
        const text = interpolate(block.text, context).trim()
        return text ? { key: block.id, node: <p className="whitespace-pre-wrap">{text}</p>, isData: false } : null
      }
      const node = renderDataBlock(block, labelRepeatsTitle)
      return node ? { key: block.id, node, isData: true } : null
    })
    const visible = rendered.filter((r) => r !== null)
    // In mock nothing is hidden: the preview shows the whole template, empty sections included.
    const hasContent = mock || (hasDataBlocks ? visible.some((r) => r.isData) : visible.length > 0)
    if (!hasContent) continue

    // As written in the template, with a colon; the text starts at the first column, the bar bleeds past it.
    atoms.push({
      key: `${section.id}:bar`,
      space: 1,
      keepWithNext: visible.length > 0,
      node: <h2 className={cn(sectionBarClass, 'break-after-avoid')}>{`${sectionTitle}:`}</h2>,
    })
    for (const r of visible) atoms.push({ key: `${section.id}:${r.key}`, space: 0.5, node: r.node })
  }
  return atoms
}

/** The template's sections in one flow (TemplateForm, view + page); the A4 sheet paginates templatePageAtoms. */
export function TemplatePageLayout(props: PageLayoutProps) {
  const atoms = templatePageAtoms(props)
  return (
    <div className={cn(subgridClass, 'text-doc')}>
      {atoms.map((atom, i) => (
        <div
          key={atom.key}
          className={subgridClass}
          style={{ marginTop: i === 0 ? 0 : `calc(var(--doc-line) * ${atom.space})` }}
        >
          {atom.node}
        </div>
      ))}
    </div>
  )
}
