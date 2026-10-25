'use client'

import { useId, useMemo, useState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { NO_COLUMN, type ColumnMapping, type SpreadsheetTable } from './import-file'

const PREVIEW_ROWS = 5

type ImportMappingStepProps = {
  table: SpreadsheetTable
  initialMapping: ColumnMapping
  onBack: () => void
  onNext: (mapping: ColumnMapping) => Promise<void>
}

export function ImportMappingStep({ table, initialMapping, onBack, onNext }: ImportMappingStepProps) {
  const id = useId()
  const [mapping, setMapping] = useState(initialMapping)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const columnItems = useMemo(
    () => table.headers.map((h, i) => ({ value: String(i), label: h })),
    [table.headers],
  )
  const optionalItems = useMemo(() => [{ value: NO_COLUMN, label: 'None' }, ...columnItems], [columnItems])

  const fields: { key: keyof ColumnMapping; label: string; items: { value: string; label: string }[] }[] = [
    { key: 'code', label: 'Code (optional)', items: optionalItems },
    { key: 'name', label: 'Service name', items: columnItems },
    { key: 'price', label: 'Price', items: columnItems },
  ]

  const handleNext = async () => {
    if (mapping.name === NO_COLUMN || mapping.price === NO_COLUMN) {
      return setError('Choose the name and price columns.')
    }
    setError(null)
    setBusy(true)
    try {
      await onNext(mapping)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not compare the price list.')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>Match columns</DialogTitle>
        <DialogDescription>
          Step 2 of 3. Tell us which columns of the file hold the code, the name and the price. Rows: {table.rows.length}.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-2">
              <Label htmlFor={`${id}-${field.key}`}>{field.label}</Label>
              <Select
                items={field.items}
                value={mapping[field.key]}
                onValueChange={(v) => v && setMapping((m) => ({ ...m, [field.key]: v as string }))}
              >
                <SelectTrigger id={`${id}-${field.key}`} className="w-full">
                  <SelectValue placeholder="Choose a column" />
                </SelectTrigger>
                <SelectContent>
                  {field.items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                {table.headers.map((h, i) => (
                  <TableHead key={i}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.slice(0, PREVIEW_ROWS).map((row, r) => (
                <TableRow key={r}>
                  {table.headers.map((_, c) => (
                    <TableCell key={c}>{row[c] ?? ''}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onBack} disabled={busy}>
          Back
        </Button>
        <Button type="button" onClick={handleNext} disabled={busy}>
          {busy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
          Compare with the current price list
        </Button>
      </DialogFooter>
    </div>
  )
}
