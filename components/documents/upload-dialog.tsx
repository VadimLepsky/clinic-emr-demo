'use client'

import { useId, useRef, useState } from 'react'
import { FileTextIcon, ImageIcon, Loader2Icon, UploadCloudIcon, XIcon } from 'lucide-react'
import { uploadDocument } from '@/lib/data'
import type { Folder } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { formatFileSize, isImage, todayIso } from './format'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

type UploadDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: string
  folders: Folder[]
  initialFolderId: string
  onUploaded: (folderId: string) => void
}

export function UploadDialog({ open, onOpenChange, ...props }: UploadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && <UploadForm key={props.initialFolderId} onCancel={() => onOpenChange(false)} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function UploadForm({
  patientId,
  folders,
  initialFolderId,
  onUploaded,
  onCancel,
}: Omit<UploadDialogProps, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const formId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [folderId, setFolderId] = useState(initialFolderId)
  const [title, setTitle] = useState('')
  const [documentDate, setDocumentDate] = useState(todayIso)
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const folderItems = folders.map((f) => ({ value: f.id, label: f.name }))

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const incoming = Array.from(list)
    const accepted = incoming.filter((f) => ACCEPTED_TYPES.includes(f.type))
    setError(accepted.length < incoming.length ? 'Only JPEG, PNG or PDF files are allowed.' : null)
    setFiles((prev) => [...prev, ...accepted])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return setError('Enter the document title.')
    if (files.length === 0) return setError('Add at least one file.')
    setSaving(true)
    try {
      await uploadDocument({
        patientId,
        folderId,
        title: title.trim(),
        documentDate,
        files,
      })
      onUploaded(folderId)
    } catch {
      setError('Could not save the document. Please try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <DialogHeader>
        <DialogTitle>Upload document</DialogTitle>
        <DialogDescription>JPEG, PNG or PDF files will be added to the patient record.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-folder`}>Folder</Label>
          <Select items={folderItems} value={folderId} onValueChange={(v) => v && setFolderId(v as string)}>
            <SelectTrigger id={`${formId}-folder`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {folderItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-title`}>
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${formId}-title`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g. Full blood count"
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-date`}>Document date</Label>
            <Input
              id={`${formId}-date`}
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Files</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              addFiles(e.dataTransfer.files)
            }}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              dragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
            )}
          >
            <UploadCloudIcon className="size-6 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm">
              Drop files here or <span className="font-medium text-primary">choose them on your computer</span>
            </span>
            <span className="text-sm text-muted-foreground">JPEG, PNG, PDF · several files allowed</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES.join(',')}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />
          {files.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2.5 rounded-md border border-border px-2.5 py-1.5"
                >
                  {isImage(file.type) ? (
                    <ImageIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <FileTextIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                    aria-label={`Remove ${file.name}`}
                  >
                    <XIcon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2Icon className="animate-spin" aria-hidden="true" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  )
}
