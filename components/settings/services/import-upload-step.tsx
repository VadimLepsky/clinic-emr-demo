'use client'

import { useId, useRef, useState } from 'react'
import { FileSpreadsheetIcon, Loader2Icon, UploadCloudIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { parseSpreadsheet, type SpreadsheetTable } from './import-file'

const ACCEPT = '.xlsx,.xls,.csv'

type ImportUploadStepProps = {
  labName: string
  labNames: string[]
  onLabNameChange: (value: string) => void
  onParsed: (table: SpreadsheetTable) => void
  onCancel: () => void
}

export function ImportUploadStep({ labName, labNames, onLabNameChange, onParsed, onCancel }: ImportUploadStepProps) {
  const id = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!labName.trim()) return setError('Enter the laboratory first.')
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return setError('Excel (.xlsx, .xls) or CSV files are allowed.')
    setError(null)
    setParsing(true)
    try {
      onParsed(await parseSpreadsheet(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the file.')
      setParsing(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>Import a lab price list</DialogTitle>
        <DialogDescription>Upload Excel or CSV: service code, name, price.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-lab`}>Laboratory</Label>
          <Input
            id={`${id}-lab`}
            list={`${id}-labs`}
            value={labName}
            onChange={(e) => onLabNameChange(e.target.value)}
            placeholder="Pick from the list or type a new name"
            autoComplete="off"
          />
          <datalist id={`${id}-labs`}>
            {labNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFile(e.dataTransfer.files[0])
          }}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center',
            dragging && 'border-primary bg-muted',
          )}
        >
          {parsing ? (
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
          ) : (
            <UploadCloudIcon className="size-6 text-muted-foreground" aria-hidden="true" />
          )}
          <p>Drop the file here or</p>
          <Button type="button" disabled={parsing} onClick={() => fileInputRef.current?.click()}>
            <FileSpreadsheetIcon aria-hidden="true" />
            Choose file
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            aria-label="Price list file"
            onChange={(e) => {
              handleFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </DialogFooter>
    </div>
  )
}
