'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { AlertTriangleIcon, ChevronRightIcon, FileTextIcon, ListChecksIcon, UploadIcon } from 'lucide-react'
import { getPrescriptionStats, listStalePrescriptions } from '@/lib/data'
import { Card, CardDescription, CardHeader, CardHeaderLink, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatDate } from '@/components/documents/format'
import { formatMoney, formatMoneyWhole } from '@/components/prescriptions/format'
import { periodRange } from '@/components/prescriptions/period'
import { CompletionBar } from '@/components/prescriptions/prescription-parts'

const STALE_DAYS = 14

const periodOptions = [
  { value: 'current', label: 'This month' },
  { value: 'previous', label: 'Last month' },
] as const

function Kpi({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <Card className="gap-2 p-6">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-3xl font-semibold tabular-nums">{value}</span>
        {unit && <span className="text-base text-muted-foreground">{unit}</span>}
      </dd>
    </Card>
  )
}

const quickLinks = [
  { href: '/templates', label: 'Document templates', icon: FileTextIcon },
  { href: '/settings/services', label: 'Services and prices', icon: ListChecksIcon },
  { href: '/settings/services?import=1', label: 'Import a lab price list', icon: UploadIcon },
]

export function ManagerHome() {
  const router = useRouter()
  const [period, setPeriod] = useState<'current' | 'previous'>('current')
  const { data: stats } = useSWR(['prescriptions', 'stats', period], () => getPrescriptionStats(periodRange(period) as { from: string; to: string }))
  const { data: stale } = useSWR(['prescriptions', 'stale'], () => listStalePrescriptions(STALE_DAYS))

  const doctorHref = (doctorId: string) => `/prescriptions?doctor=${doctorId}&period=${period}`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <div role="group" aria-label="Period" className="inline-flex rounded-xl bg-card p-1 dark:border dark:border-border">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={period === option.value}
              onClick={() => setPeriod(option.value)}
              className={cn(
                'h-9 rounded-lg px-4 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                period === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Care plans by doctor</CardTitle>
              <CardHeaderLink href={`/prescriptions?period=${period}`} />
            </CardHeader>
            {!stats ? (
              <Skeleton className="m-8 h-32" />
            ) : stats.by_doctor.length === 0 ? (
              <p className="px-8 py-10 text-center text-muted-foreground">No care plans in this period.</p>
            ) : (
              <Table className="[&_th]:whitespace-normal">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Doctor</TableHead>
                    <TableHead className="text-right">Care plans</TableHead>
                    <TableHead className="text-right">Estimated</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="min-w-32">Completion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.by_doctor.map((row) => (
                    <TableRow
                      key={row.doctor_id}
                      className="cursor-pointer"
                      onClick={() => router.push(doctorHref(row.doctor_id))}
                    >
                      <TableCell className="font-medium whitespace-normal">
                        <Link
                          href={doctorHref(row.doctor_id)}
                          onClick={(e) => e.stopPropagation()}
                          className="underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                        >
                          {row.doctor_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(row.total_amount)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(row.paid_amount)}</TableCell>
                      <TableCell>
                        <CompletionBar pct={row.completion_pct} label={`Completion: ${row.doctor_name}`} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div className="flex min-w-0 flex-col gap-1">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangleIcon className="size-5 shrink-0 text-status-warning-fg" aria-hidden="true" />
                  Needs attention
                </CardTitle>
                <CardDescription>Over {STALE_DAYS} days with nothing fulfilled</CardDescription>
              </div>
            </CardHeader>
            {!stale ? (
              <Skeleton className="m-8 h-12" />
            ) : stale.length === 0 ? (
              <p className="px-8 py-6 text-muted-foreground">All care plans are in progress.</p>
            ) : (
              <ul className="divide-y divide-border">
                {stale.map((rx) => (
                  <li key={rx.id}>
                    <Link
                      href={`/patients/${rx.patient_id}`}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-8 py-5 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                    >
                      <span className="flex flex-col gap-0.5">
                        <span className="font-semibold">{rx.patient_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {rx.doctor_name} · {formatDate(rx.created_at)}
                        </span>
                      </span>
                      <span className="rounded-md bg-status-warning-bg px-2 py-1 text-xs leading-tight font-medium text-status-warning-fg tabular-nums">
                        {formatMoney(rx.total_amount)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section aria-label="Care plan figures">
            {!stats ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-2" aria-busy="true">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                ))}
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-2">
                <Kpi label="Care plans" value={String(stats.count)} />
                <Kpi label="Estimated total" value={formatMoneyWhole(stats.total_amount)} />
                <Kpi label="Paid" value={formatMoneyWhole(stats.paid_amount)} />
                <Kpi label="Average completion" value={`${stats.completion_pct}%`} />
              </dl>
            )}
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Quick links</CardTitle>
            </CardHeader>
            <ul className="divide-y divide-border">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-3 px-8 py-5 font-medium transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  >
                    <link.icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="flex-1">{link.label}</span>
                    <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
