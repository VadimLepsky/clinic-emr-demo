'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { applyPriceImport, previewPriceImport, type PriceImportDiff, type PriceImportRow } from '@/lib/data'
import type { ServiceCategory } from '@/lib/types'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { buildImportRows, guessMapping, type ColumnMapping, type SpreadsheetTable } from './import-file'
import { ImportUploadStep } from './import-upload-step'
import { ImportMappingStep } from './import-mapping-step'
import { ImportDiffStep } from './import-diff-step'

type PriceImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  labNames: string[]
  onApplied: () => Promise<void> | void
}

export function PriceImportDialog({ open, onOpenChange, ...props }: PriceImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        {open && <ImportFlow onClose={() => onOpenChange(false)} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

type Step =
  | { name: 'upload' }
  | { name: 'mapping'; table: SpreadsheetTable; mapping: ColumnMapping }
  | { name: 'diff'; table: SpreadsheetTable; mapping: ColumnMapping; rows: PriceImportRow[]; skipped: number; diff: PriceImportDiff }

function ImportFlow({
  labNames,
  onApplied,
  onClose,
}: Pick<PriceImportDialogProps, 'labNames' | 'onApplied'> & { onClose: () => void }) {
  const [step, setStep] = useState<Step>({ name: 'upload' })
  const [labName, setLabName] = useState('')

  const handleParsed = (table: SpreadsheetTable) =>
    setStep({ name: 'mapping', table, mapping: guessMapping(table.headers) })

  const handleMapped = async (table: SpreadsheetTable, mapping: ColumnMapping) => {
    const { rows, skipped } = buildImportRows(table, mapping)
    const diff = await previewPriceImport(labName, rows)
    setStep({ name: 'diff', table, mapping, rows, skipped, diff })
  }

  const handleApply = async (rows: PriceImportRow[], defaultCategory: ServiceCategory, deactivateIds: string[]) => {
    const result = await applyPriceImport(labName, rows, { defaultCategory, deactivateIds })
    await onApplied()
    toast.success(
      `Прайс оновлено: додано ${result.added}, змінено ціни ${result.updated}, деактивовано ${result.deactivated}`,
    )
    onClose()
  }

  if (step.name === 'upload') {
    return (
      <ImportUploadStep
        labName={labName}
        labNames={labNames}
        onLabNameChange={setLabName}
        onParsed={handleParsed}
        onCancel={onClose}
      />
    )
  }

  if (step.name === 'mapping') {
    return (
      <ImportMappingStep
        table={step.table}
        initialMapping={step.mapping}
        onBack={() => setStep({ name: 'upload' })}
        onNext={(mapping) => handleMapped(step.table, mapping)}
      />
    )
  }

  return (
    <ImportDiffStep
      labName={labName}
      rows={step.rows}
      skipped={step.skipped}
      diff={step.diff}
      onBack={() => setStep({ name: 'mapping', table: step.table, mapping: step.mapping })}
      onApply={handleApply}
    />
  )
}
