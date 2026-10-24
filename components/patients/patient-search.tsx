'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { SearchIcon } from 'lucide-react'
import { calcAge, searchPatients } from '@/lib/data'
import type { Patient } from '@/lib/types'
import { formatAge, formatDate } from '@/components/app-shell/labels'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

const MIN_QUERY_LENGTH = 2

function useDebouncedValue(value: string, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const rowClass =
  'grid w-full grid-cols-2 gap-x-4 gap-y-0.5 px-8 py-4 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none sm:grid-cols-[1fr_9rem_7rem_6rem] sm:items-center'

/** Rows link to the patient card, or call onSelect instead when it is given («New visit»). */
export function PatientSearch({ onSelect }: { onSelect?: (patient: Patient) => void }) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query.trim())
  const isSearchable = debouncedQuery.length >= MIN_QUERY_LENGTH

  const { data: patients, isLoading } = useSWR(
    isSearchable ? ['patients', debouncedQuery] : null,
    ([, q]) => searchPatients(q),
    { keepPreviousData: true },
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or CRM ID"
          aria-label="Search patients by name or CRM ID"
          autoFocus
          className="h-12 rounded-xl bg-card pl-12 dark:border-border"
        />
      </div>

      {/* In a dialog the card sits on white, so it needs a border there. */}
      <Card plain={!isSearchable} aria-live="polite" className="in-data-[slot=dialog-content]:rounded-xl in-data-[slot=dialog-content]:border">
        {!isSearchable ? (
          <p className="px-8 py-6 text-muted-foreground">
            Type at least {MIN_QUERY_LENGTH} characters of the patient&apos;s name or CRM ID.
          </p>
        ) : isLoading || !patients ? (
          <div className="flex flex-col gap-2 px-8 py-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : patients.length === 0 ? (
          <p className="px-8 py-6 text-muted-foreground">
            Nobody matches «{debouncedQuery}».
          </p>
        ) : (
          <>
            <div className="hidden grid-cols-[1fr_9rem_7rem_6rem] gap-4 border-b border-border px-8 py-3 text-sm font-medium text-accent-foreground sm:grid">
              <span>Name</span>
              <span>Date of birth</span>
              <span>Age</span>
              <span className="text-right">CRM ID</span>
            </div>
            <ul className="divide-y divide-border">
              {patients.map((patient) => {
                const cells = (
                  <>
                    <span className="col-span-2 font-semibold sm:col-span-1">{patient.full_name}</span>
                    <span className="text-popover-foreground">{formatDate(patient.birth_date)}</span>
                    <span className="text-right text-popover-foreground sm:text-left">
                      {formatAge(calcAge(patient.birth_date))}
                    </span>
                    <span className="hidden text-right tabular-nums text-popover-foreground sm:block">
                      {patient.crm_client_id}
                    </span>
                  </>
                )
                return (
                  <li key={patient.id}>
                    {onSelect ? (
                      <button type="button" onClick={() => onSelect(patient)} className={`${rowClass} cursor-pointer`}>
                        {cells}
                      </button>
                    ) : (
                      <Link href={`/patients/${patient.id}`} className={rowClass}>
                        {cells}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Card>
    </div>
  )
}
