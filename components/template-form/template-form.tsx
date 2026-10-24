'use client'

import type { Block, DocumentValues, FieldValue, Service, ServicePackage, TemplateSchema } from '@/lib/types'
import { FieldBlock } from './field-block'
import { ImageBlockView } from './image-block'
import { LockedServicesNote, ServicesBlock } from './services-block'
import { TemplatePageLayout } from './page-layout'
import { TemplatePageEditLayout } from './page-edit-layout'
import { ServicePackagesBar, ServicesTotal } from './service-packages-bar'
import { useServicesEditContext, type SearchServices } from './services-context'
import { collectServiceBlocks, fieldNames, interpolate, sectionElementId, type TemplateFormContext } from './utils'

export type TemplateFormProps = {
  schema: TemplateSchema
  values: DocumentValues
  onChange: (blockId: string, value: FieldValue) => void
  context: TemplateFormContext
  mode: 'edit' | 'view'
  /** Resolved services for already selected items (name + price). */
  services?: Service[]
  /** Ready-made service bundles offered in edit mode. */
  servicePackages?: ServicePackage[]
  /** Service search used by the services fields in edit mode. */
  onSearchServices?: SearchServices
  /** Field ids to highlight as invalid. */
  invalidFieldIds?: string[]
  /** "page" renders the A4 document look: read-only in "view", inline-editable in "edit". */
  layout?: 'form' | 'page'
  /** With mode "view" + layout "page": a template mockup — skeleton bars instead of values, nothing hidden. */
  mock?: boolean
  /** Edit mode: the prescription made from this document is paid, so services fields are read-only (with a note). */
  lockedServices?: boolean
}

export function TemplateForm({
  schema,
  values,
  onChange,
  context,
  mode,
  services = [],
  servicePackages = [],
  onSearchServices,
  invalidFieldIds = [],
  layout = 'form',
  mock = false,
  lockedServices = false,
}: TemplateFormProps) {
  const servicesContext = useServicesEditContext(services, servicePackages, onSearchServices)

  if (layout === 'page') {
    return mode === 'view' ? (
      <TemplatePageLayout schema={schema} values={values} context={context} services={services} mock={mock} />
    ) : (
      <TemplatePageEditLayout
        schema={schema}
        values={values}
        onChange={onChange}
        context={context}
        services={services}
        servicesContext={servicesContext}
        invalidFieldIds={invalidFieldIds}
        lockedServices={lockedServices}
      />
    )
  }

  const invalid = new Set(invalidFieldIds)
  const lastServicesBlockId = collectServiceBlocks(schema).at(-1)?.id
  const names = fieldNames(schema)

  const renderBlock = (block: Block) => {
    switch (block.kind) {
      case 'field':
        return (
          <FieldBlock
            key={block.id}
            field={block}
            name={names.get(block.id)}
            value={values[block.id]}
            onChange={(v) => onChange(block.id, v)}
            mode={mode}
            invalid={invalid.has(block.id)}
          />
        )
      case 'group':
        return (
          <fieldset key={block.id} className="rounded-xl border border-border p-5">
            <legend className="px-1 font-semibold">{block.title}</legend>
            <div className="grid gap-4 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
              {block.blocks
                .filter((b) => b.kind === 'field')
                .map((field) => (
                  <FieldBlock
                    key={field.id}
                    field={field}
                    name={names.get(field.id)}
                    value={values[field.id]}
                    onChange={(v) => onChange(field.id, v)}
                    mode={mode}
                    invalid={invalid.has(field.id)}
                  />
                ))}
            </div>
          </fieldset>
        )
      case 'image':
        return <ImageBlockView key={block.id} block={block} />
      case 'static':
        return (
          <p key={block.id} className="leading-relaxed whitespace-pre-wrap text-foreground">
            {interpolate(block.text, context)}
          </p>
        )
      case 'services':
        return (
          <div key={block.id} className="flex flex-col gap-2">
            <ServicesBlock
              block={block}
              value={values[block.id]}
              services={services}
              mode={lockedServices ? 'view' : mode}
              onChange={(v) => onChange(block.id, v)}
              context={servicesContext}
            />
            {mode === 'edit' && !lockedServices && block.id === lastServicesBlockId && (
              <ServicesTotal schema={schema} values={values} catalog={servicesContext.catalog} />
            )}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {schema.sections.map((section) => (
        <section
          key={section.id}
          id={sectionElementId(section.id)}
          aria-labelledby={`${sectionElementId(section.id)}-title`}
          className="scroll-mt-10 rounded-2xl bg-card text-card-foreground dark:border dark:border-border"
        >
          <h2
            id={`${sectionElementId(section.id)}-title`}
            className="border-b border-border px-8 py-6 text-lg font-semibold"
          >
            {section.title}
          </h2>
          <div className="flex flex-col gap-5 px-8 py-6">
            {mode === 'edit' && lockedServices && section.blocks.some((b) => b.kind === 'services') && (
              <LockedServicesNote />
            )}
            {mode === 'edit' && !lockedServices && (
              <ServicePackagesBar
                blocks={section.blocks.filter((b) => b.kind === 'services')}
                values={values}
                onChange={onChange}
                context={servicesContext}
              />
            )}
            {section.blocks.map(renderBlock)}
          </div>
        </section>
      ))}
    </div>
  )
}
