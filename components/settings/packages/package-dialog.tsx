'use client'

import { useId, useState } from 'react'
import { toast } from 'sonner'
import { Loader2Icon, XIcon } from 'lucide-react'
import { saveServicePackage } from '@/lib/data'
import type { Service, ServicePackage } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatMoney } from '@/components/prescriptions/format'
import { ServiceAddSearch } from '@/components/prescriptions/service-add-search'

type PackageDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pkg: ServicePackage | null
  services: Map<string, Service>
  onSaved: () => Promise<void>
}

type Line = { service: Service; quantity: number }

export function PackageDialog({ open, onOpenChange, pkg, services, onSaved }: PackageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {open && (
          <PackageForm key={pkg?.id ?? 'new'} pkg={pkg} services={services} onSaved={onSaved} onCancel={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function PackageForm({
  pkg,
  services,
  onSaved,
  onCancel,
}: Pick<PackageDialogProps, 'pkg' | 'services' | 'onSaved'> & { onCancel: () => void }) {
  const id = useId()
  const [name, setName] = useState(pkg?.name ?? '')
  const [lines, setLines] = useState<Line[]>(() =>
    (pkg?.items ?? []).flatMap((i) => {
      const service = services.get(i.service_id)
      return service ? [{ service, quantity: i.quantity }] : []
    }),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = lines.reduce((sum, l) => sum + l.service.price * l.quantity, 0)

  const addService = (service: Service) =>
    setLines((prev) =>
      prev.some((l) => l.service.id === service.id)
        ? prev.map((l) => (l.service.id === service.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [...prev, { service, quantity: 1 }],
    )

  const setQuantity = (serviceId: string, value: string) =>
    setLines((prev) =>
      prev.map((l) => (l.service.id === serviceId ? { ...l, quantity: Math.max(1, Math.floor(Number(value)) || 1) } : l)),
    )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Enter a bundle name.')
    if (!lines.length) return setError('Add at least one service.')
    setSaving(true)
    setError(null)
    try {
      await saveServicePackage({
        id: pkg?.id,
        name,
        items: lines.map((l) => ({ service_id: l.service.id, quantity: l.quantity })),
      })
      toast.success(pkg ? 'Bundle updated' : 'Bundle created')
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the bundle.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <DialogHeader>
        <DialogTitle>{pkg ? 'Edit bundle' : 'New service bundle'}</DialogTitle>
        <DialogDescription>Add the services that should go into orders together.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-name`}>Name</Label>
          <Input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-search`}>Add service</Label>
          <ServiceAddSearch inputId={`${id}-search`} onAdd={addService} />
        </div>

        {lines.length > 0 && (
          <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {lines.map((line) => (
              <li key={line.service.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="flex-1">
                  {line.service.name}
                  {!line.service.is_active && <span className="ml-2 text-muted-foreground">(inactive)</span>}
                </span>
                <span className="text-muted-foreground tabular-nums">{formatMoney(line.service.price)}</span>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={line.quantity}
                  onChange={(e) => setQuantity(line.service.id, e.target.value)}
                  aria-label={`Quantity: ${line.service.name}`}
                  className="w-16"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove: ${line.service.name}`}
                  onClick={() => setLines((prev) => prev.filter((l) => l.service.id !== line.service.id))}
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <p className="text-sm text-muted-foreground">
          Bundle total: <span className="font-medium text-foreground tabular-nums">{formatMoney(total)}</span>
        </p>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2Icon className="animate-spin" aria-hidden="true" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  )
}
