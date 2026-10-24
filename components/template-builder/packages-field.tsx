'use client'

import useSWR from 'swr'
import { listServicePackages } from '@/lib/data'
import { plural } from '@/lib/format'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox'

// Not the package itself: Base UI takes objects with an `items` array for groups of items.
type PackageOption = { id: string; name: string; size: number }

/** «Service bundles in this template»: any number of bundles out of all of them (there can be 20+), with search. */
export function PackagesField({ id, value, onChange }: { id: string; value: string[]; onChange: (ids: string[]) => void }) {
  const anchor = useComboboxAnchor()
  const { data: packages = [] } = useSWR('service-packages', listServicePackages)
  const options: PackageOption[] = packages.map((pkg) => ({ id: pkg.id, name: pkg.name, size: pkg.items.length }))
  const selected = value.flatMap((packageId) => options.find((o) => o.id === packageId) ?? [])

  return (
    <Combobox<PackageOption, true>
      multiple
      items={options}
      value={selected}
      itemToStringLabel={(option) => option.name}
      isItemEqualToValue={(a, b) => a.id === b.id}
      onValueChange={(next) => onChange(next.map((option) => option.id))}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(chosen: PackageOption[]) => (
            <>
              {chosen.map((option) => (
                <ComboboxChip key={option.id}>{option.name}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                id={id}
                placeholder={chosen.length === 0 ? 'None chosen — search by bundle name' : undefined}
                className="placeholder:text-muted-foreground"
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>No bundles found</ComboboxEmpty>
        <ComboboxList>
          {(option: PackageOption) => (
            <ComboboxItem key={option.id} value={option}>
              <span className="min-w-0 flex-1 truncate">{option.name}</span>
              <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{plural(option.size, 'service')}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
