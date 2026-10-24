'use client'

import { PlusIcon } from 'lucide-react'
import type { DocumentValues, FieldValue, Service, ServiceSelection, ServicesBlock, TemplateSchema } from '@/lib/types'
import { Button } from '@/components/ui/button'
import type { ServicesEditContext } from './services-context'
import { asServiceSelections, getSelectedServices } from './utils'

const priceFormatter = new Intl.NumberFormat('uk-UA', {
  style: 'currency',
  currency: 'UAH',
  maximumFractionDigits: 0,
})

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
      aria-label="Пакети послуг"
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

function servicesWord(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'послуга'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'послуги'
  return 'послуг'
}

// Every service counts; the sum is of the clinic's prices (a service outside the clinic has none).
export function ServicesTotal({ schema, values, catalog }: ServicesTotalProps) {
  const selected = getSelectedServices(schema, values)
  const total = selected.reduce(
    (sum, s) => sum + (s.serviceId !== undefined ? (catalog.get(s.serviceId)?.price ?? 0) * s.quantity : 0),
    0,
  )
  return (
    <p className="text-sm text-muted-foreground tabular-nums print:hidden" aria-live="polite">
      {`Призначення: ${selected.length} ${servicesWord(selected.length)} на суму ${priceFormatter.format(total)}`}
    </p>
  )
}
