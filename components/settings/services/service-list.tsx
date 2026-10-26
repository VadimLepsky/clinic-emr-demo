'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, LockIcon, SearchIcon, UploadIcon } from 'lucide-react'
import { listAllServices, listServiceLabNames, updateService, type ServiceFilters } from '@/lib/data'
import type { Service, ServiceCategory } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatMoney, serviceSourceLabel } from '@/components/prescriptions/format'
import { cn } from '@/lib/utils'
import { serviceCategories } from '../service-categories'
import { PriceImportDialog } from './price-import-dialog'

const ALL = 'all'
const PAGE_SIZE = 50

type SortBy = NonNullable<ServiceFilters['sortBy']>

export function ServiceList({ initialImportOpen = false }: { initialImportOpen?: boolean }) {
  const { mutate: mutateGlobal } = useSWRConfig()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>(ALL)
  const [source, setSource] = useState<string>(ALL)
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [importOpen, setImportOpen] = useState(initialImportOpen)
  const deferredQuery = useDeferredValue(query)

  const filters: ServiceFilters = {
    query: deferredQuery,
    category: category === ALL ? undefined : (category as ServiceCategory),
    source: source === ALL ? undefined : source,
    sortBy,
    sortDir,
  }
  const { data: services, mutate } = useSWR(['services-all', filters], ([, f]) => listAllServices(f), {
    keepPreviousData: true,
  })
  const { data: labNames = [], mutate: mutateLabNames } = useSWR('service-lab-names', listServiceLabNames)

  useEffect(() => setPage(0), [deferredQuery, category, source, sortBy, sortDir])

  const categoryItems = useMemo(
    () => [{ value: ALL, label: 'All categories' }, ...serviceCategories],
    [],
  )
  const sourceItems = useMemo(
    () => [
      { value: ALL, label: 'All sources' },
      { value: 'crm', label: 'Clinic' },
      ...labNames.map((n) => ({ value: n, label: n })),
    ],
    [labNames],
  )

  const refreshSearchCaches = () =>
    mutateGlobal((key) => Array.isArray(key) && (key[0] === 'service-search' || key[0] === 'services-by-ids'))

  const patchService = async (service: Service, patch: { category?: ServiceCategory; is_active?: boolean }) => {
    try {
      await mutate(
        async (current) => {
          await updateService(service.id, patch)
          return current?.map((s) => (s.id === service.id ? { ...s, ...patch } : s))
        },
        {
          optimisticData: (current) => (current ?? []).map((s) => (s.id === service.id ? { ...s, ...patch } : s)),
          rollbackOnError: true,
          revalidate: false,
        },
      )
      await refreshSearchCaches()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the changes')
    }
  }

  const toggleSort = (column: SortBy) => {
    if (sortBy === column) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(column)
      setSortDir('asc')
    }
  }

  const handleImported = async () => {
    await Promise.all([mutate(), mutateLabNames(), refreshSearchCaches()])
  }

  const total = services?.length ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const visible = services?.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  return (
    <Card>
      <CardHeader>
        <div className="flex max-w-3xl min-w-0 flex-col gap-1">
          <CardTitle>Services</CardTitle>
          <CardDescription>
            The catalog providers search for order services. Services with the «Clinic» source sync from the
            CRM — only their category and active state can be changed.
          </CardDescription>
        </div>
        <Button onClick={() => setImportOpen(true)}>
          <UploadIcon aria-hidden="true" />
          Import a lab price list
        </Button>
      </CardHeader>

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-8 py-4">
        <div className="relative min-w-56 flex-1 sm:max-w-sm">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or code"
            aria-label="Search by name or code"
            className="pl-9"
          />
        </div>
        <Select items={categoryItems} value={category} onValueChange={(v) => v && setCategory(v as string)}>
          <SelectTrigger aria-label="Category" className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categoryItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select items={sourceItems} value={source} onValueChange={(v) => v && setSource(v as string)}>
          <SelectTrigger aria-label="Source" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sourceItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-24">Code</TableHead>
            <SortableHead
              label="Name"
              active={sortBy === 'name'}
              dir={sortDir}
              onClick={() => toggleSort('name')}
            />
            <TableHead className="w-60">Category</TableHead>
            <TableHead className="w-32">Source</TableHead>
            <SortableHead
              label="Price"
              align="right"
              active={sortBy === 'price'}
              dir={sortDir}
              onClick={() => toggleSort('price')}
            />
            <TableHead className="w-24">Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!services &&
            Array.from({ length: 5 }, (_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={6}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            ))}
          {services?.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                Nothing found.
              </TableCell>
            </TableRow>
          )}
          {visible?.map((service) => (
            <TableRow key={service.id} className={cn(!service.is_active && 'text-muted-foreground')}>
              <TableCell className="tabular-nums">{service.code ?? '—'}</TableCell>
              <TableCell className="whitespace-normal">{service.name}</TableCell>
              <TableCell>
                <Select
                  items={serviceCategories}
                  value={service.category}
                  onValueChange={(v) => v && patchService(service, { category: v as ServiceCategory })}
                >
                  <SelectTrigger size="sm" aria-label={`Category: ${service.name}`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceCategories.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>{serviceSourceLabel(service)}</TableCell>
              <TableCell className="text-right tabular-nums">
                <span className="inline-flex items-center justify-end gap-1.5">
                  {service.source === 'crm' && (
                    <LockIcon
                      className="size-3.5 text-muted-foreground"
                      aria-label="Synced from the CRM"
                    />
                  )}
                  {formatMoney(service.price)}
                </span>
              </TableCell>
              <TableCell>
                <Switch
                  checked={service.is_active}
                  onCheckedChange={(checked) => patchService(service, { is_active: checked })}
                  aria-label={`Active: ${service.name}`}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {total > PAGE_SIZE && (
        <CardFooter className="justify-between text-sm text-muted-foreground">
          <span>
            {currentPage * PAGE_SIZE + 1}–{Math.min(total, (currentPage + 1) * PAGE_SIZE)} of {total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
              Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </CardFooter>
      )}

      <PriceImportDialog open={importOpen} onOpenChange={setImportOpen} labNames={labNames} onApplied={handleImported} />
    </Card>
  )
}

function SortableHead({
  label,
  active,
  dir,
  align,
  onClick,
}: {
  label: string
  active: boolean
  dir: 'asc' | 'desc'
  align?: 'right'
  onClick: () => void
}) {
  const Icon = !active ? ChevronsUpDownIcon : dir === 'asc' ? ArrowUpIcon : ArrowDownIcon
  return (
    <TableHead
      aria-sort={!active ? 'none' : dir === 'asc' ? 'ascending' : 'descending'}
      className={align === 'right' ? 'text-right' : undefined}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
          active && 'text-foreground',
        )}
      >
        {label}
        <Icon className="size-3.5" aria-hidden="true" />
      </button>
    </TableHead>
  )
}
