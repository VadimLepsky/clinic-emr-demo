'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { deleteServicePackage, getServicesByIds, listServicePackages } from '@/lib/data'
import type { Service, ServicePackage } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatMoney } from '@/components/prescriptions/format'
import { plural } from '@/lib/format'
import { PackageDialog } from './package-dialog'

export function PackageList() {
  const { data: packages, mutate } = useSWR('service-packages', listServicePackages)
  const allIds = [...new Set((packages ?? []).flatMap((p) => p.items.map((i) => i.service_id)))].sort()
  const { data: serviceList = [] } = useSWR(
    allIds.length ? ['services-by-ids', ...allIds] : null,
    ([, ...ids]) => getServicesByIds(ids),
    { keepPreviousData: true },
  )
  const services = new Map(serviceList.map((s) => [s.id, s]))

  const [editing, setEditing] = useState<ServicePackage | 'new' | null>(null)
  const [deleting, setDeleting] = useState<ServicePackage | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteServicePackage(deleting.id)
      await mutate()
      toast.success(`Bundle «${deleting.name}» deleted`)
      setDeleting(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete the bundle')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle>Service bundles</CardTitle>
          <CardDescription>
            Ready-made sets of services a doctor adds to a care plan in one click.
          </CardDescription>
        </div>
        <Button onClick={() => setEditing('new')}>
          <PlusIcon aria-hidden="true" />
          New bundle
        </Button>
      </CardHeader>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Contents</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-24">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!packages && (
            <TableRow>
              <TableCell colSpan={4}>
                <Skeleton className="h-6 w-full" />
              </TableCell>
            </TableRow>
          )}
          {packages?.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                No bundles yet.
              </TableCell>
            </TableRow>
          )}
          {packages?.map((pkg) => (
            <PackageRow
              key={pkg.id}
              pkg={pkg}
              services={services}
              onEdit={() => setEditing(pkg)}
              onDelete={() => setDeleting(pkg)}
            />
          ))}
        </TableBody>
      </Table>

      <PackageDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        pkg={editing === 'new' ? null : editing}
        services={services}
        onSaved={async () => {
          await mutate()
          setEditing(null)
        }}
      />

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && !deleteBusy && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete bundle?</DialogTitle>
            <DialogDescription>
              Bundle «{deleting?.name}» will be deleted. Existing care plans won&apos;t change.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteBusy}>
              {deleteBusy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function PackageRow({
  pkg,
  services,
  onEdit,
  onDelete,
}: {
  pkg: ServicePackage
  services: Map<string, Service>
  onEdit: () => void
  onDelete: () => void
}) {
  const total = pkg.items.reduce((sum, i) => sum + (services.get(i.service_id)?.price ?? 0) * i.quantity, 0)
  const summary = pkg.items
    .map((i) => {
      const name = services.get(i.service_id)?.name ?? '…'
      return i.quantity > 1 ? `${name} × ${i.quantity}` : name
    })
    .join(', ')
  return (
    <TableRow>
      <TableCell className="font-medium">{pkg.name}</TableCell>
      <TableCell className="max-w-md whitespace-normal text-muted-foreground">
        <span className="text-foreground">{plural(pkg.items.length, 'service')}</span>: {summary}
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatMoney(total)}</TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit: ${pkg.name}`}>
            <PencilIcon aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label={`Delete: ${pkg.name}`}>
            <Trash2Icon aria-hidden="true" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
