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
      toast.success(`Пакет «${deleting.name}» видалено`)
      setDeleting(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не вдалося видалити пакет')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle>Пакети послуг</CardTitle>
          <CardDescription>
            Готові набори послуг, які лікар додає до призначення одним кліком.
          </CardDescription>
        </div>
        <Button onClick={() => setEditing('new')}>
          <PlusIcon aria-hidden="true" />
          Новий пакет
        </Button>
      </CardHeader>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Назва</TableHead>
            <TableHead>Склад</TableHead>
            <TableHead className="text-right">Сума</TableHead>
            <TableHead className="w-24">
              <span className="sr-only">Дії</span>
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
                Пакетів ще немає.
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
            <DialogTitle>Видалити пакет?</DialogTitle>
            <DialogDescription>
              Пакет «{deleting?.name}» буде видалено. Вже створені призначення не зміняться.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deleteBusy}>
              Скасувати
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteBusy}>
              {deleteBusy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
              Видалити
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
        <span className="text-foreground">{pkg.items.length} посл.</span>: {summary}
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatMoney(total)}</TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Редагувати: ${pkg.name}`}>
            <PencilIcon aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label={`Видалити: ${pkg.name}`}>
            <Trash2Icon aria-hidden="true" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
