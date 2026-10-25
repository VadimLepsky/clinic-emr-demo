'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { PlusIcon } from 'lucide-react'
import { searchServices } from '@/lib/data'
import type { Service } from '@/lib/types'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { OUTSIDE_CLINIC_LABEL } from '@/components/template-form/utils'
import { formatMoney, serviceSourceLabel } from './format'

const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 200

/** A catalog service, or (with onAddCustom) the typed text as a service outside the clinic. */
type AddOption = { key: string; service: Service; customName?: undefined } | { key: string; customName: string; service?: undefined }

type ServiceAddSearchProps = {
  inputId: string
  onAdd: (service: Service) => void
  /** Adds the typed text as a service outside the clinic: always the last item, also when nothing is found. */
  onAddCustom?: (name: string) => void
  placeholder?: string
  autoFocus?: boolean
  /** Called on Escape or on leaving the field while it is empty (inline use on the prescription sheet). */
  onDismiss?: () => void
  className?: string
}

export function ServiceAddSearch({
  inputId,
  onAdd,
  onAddCustom,
  placeholder = 'Add a service: name or code (3 characters or more)',
  autoFocus,
  onDismiss,
  className,
}: ServiceAddSearchProps) {
  const [input, setInput] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(input.trim()), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [input])

  const typed = input.trim()
  const canSearch = typed.length >= MIN_QUERY_LENGTH
  const query = canSearch && debounced.length >= MIN_QUERY_LENGTH ? debounced : null

  const { data, isLoading } = useSWR(query ? ['service-search', 'any', query] : null, ([, , q]) => searchServices(q), {
    keepPreviousData: true,
  })
  const results = canSearch ? (data ?? []) : []
  const pending = canSearch && (isLoading || debounced !== typed)
  const items: AddOption[] = [
    ...results.map((service) => ({ key: service.id, service })),
    ...(onAddCustom && typed ? [{ key: `custom:${typed}`, customName: typed }] : []),
  ]

  return (
    <Combobox<AddOption, false>
      items={items}
      filter={null}
      autoHighlight
      value={null}
      inputValue={input}
      open={open && (onAddCustom ? typed.length > 0 : canSearch)}
      onOpenChange={setOpen}
      onInputValueChange={setInput}
      itemToStringLabel={(option) => option.service?.name ?? option.customName ?? ''}
      isItemEqualToValue={(a, b) => a.key === b.key}
      onValueChange={(option) => {
        if (!option) return
        if (option.service) onAdd(option.service)
        else onAddCustom?.(option.customName)
        setInput('')
      }}
    >
      <ComboboxInput
        id={inputId}
        showTrigger={false}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onKeyDown={(e) => {
          // Escape in the empty inline search closes only the search, not the dialog around it.
          if (e.key === 'Escape' && !input && onDismiss) {
            e.preventDefault()
            e.stopPropagation()
            onDismiss()
          }
        }}
        onBlur={() => {
          if (!input && !open) onDismiss?.()
        }}
        className={className ?? 'w-full'}
      />
      <ComboboxContent>
        <ComboboxEmpty>{pending ? 'Searching…' : 'Nothing found'}</ComboboxEmpty>
        {onAddCustom && (!canSearch || pending || results.length === 0) && (
          <p className="px-3 pt-2 text-sm text-muted-foreground">
            {!canSearch
              ? `Catalog search — ${MIN_QUERY_LENGTH} characters or more`
              : pending
                ? 'Searching…'
                : 'Nothing found in the catalog'}
          </p>
        )}
        <ComboboxList>
          {(option: AddOption) =>
            option.service ? (
              <ComboboxItem key={option.key} value={option}>
                <span className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span className="w-16 shrink-0 truncate text-sm text-muted-foreground tabular-nums">
                    {option.service.code ?? '—'}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{option.service.name}</span>
                  <span className="shrink-0 tabular-nums">{formatMoney(option.service.price)}</span>
                  <span className="w-20 shrink-0 truncate text-right text-sm text-muted-foreground">
                    {serviceSourceLabel(option.service)}
                  </span>
                </span>
              </ComboboxItem>
            ) : (
              <ComboboxItem key={option.key} value={option}>
                <PlusIcon className="text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1">{`Add «${option.customName}» as an ${OUTSIDE_CLINIC_LABEL} service`}</span>
              </ComboboxItem>
            )
          }
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
