'use client'

import { PlusIcon } from 'lucide-react'
import type { DocumentValues, FieldValue, Service, ServiceSelection, ServicesBlock, TemplateSchema } from '@/lib/types'
import { Button } from '@/components/ui/button'
import type { ServicesEditContext } from './services-context'
import { formatMoney, plural } from '@/lib/format'
import { asServiceSelections, getSelectedServices } from './utils'


type ServicePackagesBarProps = {
  blocks: ServicesBlock[]
  values: DocumentValues
  onChange: (blockId: string, value: FieldValue) => void
  context: ServicesEditContext
  className?: string
}

export function ServicePackagesBar({ blocks, values, onChange, context, className }: ServicePackagesBarProps) {
  if (context.packages.length === 0 || blocks.length === 0) return null

  const addPackage = (packageId: string) => {
    const pkg = context.packages.find((p) => p.id === packageId)
    if (!pkg) return
    const additions = new Map<string, ServiceSelection[]>()
    for (const item of pkg.items) {
      const service = context.catalog.get(item.service_id)
      if (!service) continue
      const block = blocks.find((b) => b.category === service.category)
      if (!block) continue
      const current = [...asServiceSelections(values[block.id]), ...(additions.get(block.id) ?? [])]
      if (current.some((s) => s.serviceId === service.id)) continue
      additions.set(block.id, [...(additions.get(block.id) ?? []), { serviceId: service.id, quantity: 1 }])
    }
    additions.forEach((added, blockId) => onChange(blockId, [...asServiceSelections(values[blockId]), ...added]))
  }

  return (
    <div
      role="group"
      aria-label="Service bundles"
      className={className ?? 'flex flex-wrap items-center gap-1.5 print:hidden'}
    >
      {context.packages.map((pkg) => (
        <Button key={pkg.id} type="button" variant="outline" size="sm" onClick={() => addPackage(pkg.id)}>
          <PlusIcon className="size-3.5" aria-hidden="true" />
          {pkg.name}
        </Button>
      ))}
    </div>
  )
}

type ServicesTotalProps = {
  schema: TemplateSchema
  values: DocumentValues
  catalog: Map<string, Service>
}

// Every service counts; the sum is of the clinic's prices (an External service has none).
export function ServicesTotal({ schema, values, catalog }: ServicesTotalProps) {
  const selected = getSelectedServices(schema, values)
  const total = selected.reduce(
    (sum, s) => sum + (s.serviceId !== undefined ? (catalog.get(s.serviceId)?.price ?? 0) * s.quantity : 0),
    0,
  )
  return (
    <p className="text-sm text-muted-foreground tabular-nums print:hidden" aria-live="polite">
      {`Orders: ${plural(selected.length, 'service')}, ${formatMoney(total)}`}
    </p>
  )
}
