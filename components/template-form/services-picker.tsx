'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { PlusIcon } from 'lucide-react'
import type { Service, ServiceCategory, ServiceSelection } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox'
import type { SearchServices } from './services-context'
import { OUTSIDE_CLINIC_LABEL, selectionKey } from './utils'

const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 200

const priceFormatter = new Intl.NumberFormat('uk-UA', {
  style: 'currency',
  currency: 'UAH',
  maximumFractionDigits: 0,
})

export function serviceChipLabel(service: Service) {
  return service.code ? `${service.code} ${service.name}` : service.name
}

function sourceLabel(service: Service) {
  return service.source === 'crm' ? 'Клініка' : (service.lab_name ?? 'Лабораторія')
}

/** A dropdown item and a chip: a catalog service, or one outside the clinic (only the typed name). */
type PickerOption = { key: string; service: Service; customName?: undefined } | { key: string; customName: string; service?: undefined }

const serviceOption = (service: Service): PickerOption => ({ key: service.id, service })
const customOption = (customName: string): PickerOption => ({
  key: selectionKey({ customName, quantity: 1 }),
  customName,
})

type ServicesPickerProps = {
  id: string
  labelId: string
  category: ServiceCategory
  selections: ServiceSelection[]
  catalog: Map<string, Service>
  onSearch: SearchServices
  onChange: (selections: ServiceSelection[]) => void
  className?: string
}

export function ServicesPicker({
  id,
  labelId,
  category,
  selections,
  catalog,
  onSearch,
  onChange,
  className,
}: ServicesPickerProps) {
  const anchor = useComboboxAnchor()
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

  const { data, isLoading } = useSWR(
    query ? ['service-search', category, query] : null,
    ([, cat, q]) => onSearch(q, cat),
    { keepPreviousData: true },
  )
  const results = canSearch ? (data ?? []) : []
  const pending = canSearch && (isLoading || debounced !== typed)

  const byKey = new Map(selections.map((s) => [selectionKey(s), s]))
  const selectedOptions = selections.flatMap((s) => {
    if (s.customName !== undefined) return [customOption(s.customName)]
    const service = catalog.get(s.serviceId)
    return service ? [serviceOption(service)] : []
  })
  const unresolved = selections.filter((s) => s.serviceId !== undefined && !catalog.has(s.serviceId))
  // The last item is always «Додати «…» як послугу поза клінікою», also when the search finds nothing
  // (and before the search starts: an outside-clinic name may be shorter than the search minimum).
  const items = typed ? [...results.map(serviceOption), customOption(typed)] : []

  const toSelection = (option: PickerOption): ServiceSelection => {
    const quantity = byKey.get(option.key)?.quantity ?? 1
    return option.service ? { serviceId: option.service.id, quantity } : { customName: option.customName, quantity }
  }

  return (
    <Combobox<PickerOption, true>
      multiple
      items={items}
      filter={null}
      autoHighlight
      value={selectedOptions}
      inputValue={input}
      open={open && typed.length > 0}
      onOpenChange={setOpen}
      onInputValueChange={setInput}
      itemToStringLabel={(option) => (option.service ? serviceChipLabel(option.service) : option.customName)}
      isItemEqualToValue={(a, b) => a.key === b.key}
      onValueChange={(next, details) => {
        // Picking an already chosen service must not remove it; removal is only via the chip's ×.
        if (details.reason === 'item-press' && next.length < selectedOptions.length) return
        if (details.reason === 'item-press') setInput('')
        onChange([...next.map(toSelection), ...unresolved])
      }}
    >
      <ComboboxChips
        ref={anchor}
        className={cn(
          'min-h-6 min-w-[14rem] flex-1 gap-1 rounded-sm border-0 border-b border-input bg-secondary/70 px-1 py-0.5 text-sm hover:bg-secondary focus-within:ring-2 dark:bg-secondary/70',
          className,
        )}
      >
        <ComboboxValue>
          {(value: PickerOption[]) => (
            <>
              {value.map((option) => (
                <ComboboxChip key={option.key} className="h-5 bg-background ring-1 ring-border">
                  {option.service ? serviceChipLabel(option.service) : option.customName}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput
                id={id}
                aria-labelledby={labelId}
                placeholder={value.length === 0 ? 'Введіть назву або код послуги' : undefined}
                className="h-5 bg-transparent placeholder:text-muted-foreground"
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        {(!canSearch || pending || results.length === 0) && (
          <p className="px-3 pt-2 text-sm text-muted-foreground">
            {!canSearch
              ? `Пошук у довіднику — від ${MIN_QUERY_LENGTH} символів`
              : pending
                ? 'Пошук…'
                : 'У довіднику нічого не знайдено'}
          </p>
        )}
        <ComboboxList>
          {(option: PickerOption) =>
            option.service ? (
              <ComboboxItem key={option.key} value={option}>
                <span className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span className="w-16 shrink-0 truncate text-sm text-muted-foreground tabular-nums">
                    {option.service.code ?? '—'}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{option.service.name}</span>
                  <span className="shrink-0 tabular-nums">{priceFormatter.format(option.service.price)}</span>
                  <span className="w-20 shrink-0 truncate text-right text-sm text-muted-foreground">
                    {sourceLabel(option.service)}
                  </span>
                </span>
              </ComboboxItem>
            ) : (
              <ComboboxItem key={option.key} value={option}>
                <PlusIcon className="text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1">{`Додати «${option.customName}» як послугу ${OUTSIDE_CLINIC_LABEL}`}</span>
              </ComboboxItem>
            )
          }
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
