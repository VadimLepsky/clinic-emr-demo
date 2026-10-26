'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  ChevronDownIcon,
  FileBadgeIcon,
  FlaskConicalIcon,
  PlusIcon,
  ScanLineIcon,
  StethoscopeIcon,
  UploadIcon,
} from 'lucide-react'
import { canCreateKind, listTemplates } from '@/lib/data'
import type { StaffRole, TemplateKind } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TemplatePickerDialog } from './template-picker-dialog'

type Icon = React.ComponentType<{ className?: string }>

// Documents filled in from a template: an item opens the template picker for its type.
const TEMPLATE_OPTIONS: { kind: TemplateKind; label: string; icon: Icon }[] = [
  { kind: 'consultation', label: 'Visit note', icon: StethoscopeIcon },
  { kind: 'ultrasound', label: 'Ultrasound', icon: ScanLineIcon },
  { kind: 'lab', label: 'Lab results', icon: FlaskConicalIcon },
  { kind: 'certificate', label: 'Letter or form', icon: FileBadgeIcon },
]

// Results from labs and devices still arrive as files; «Upload from computer» is for everyone.
const UPLOAD_OPTIONS: { key: string; label: string; kind: TemplateKind | null; folderName: string }[] = [
  { key: 'ultrasound', label: 'Upload an ultrasound file', kind: 'ultrasound', folderName: 'Ultrasound' },
  { key: 'lab', label: 'Upload lab results', kind: 'lab', folderName: 'Lab results' },
  { key: 'other', label: 'Upload from computer', kind: null, folderName: 'Other files' },
]

type AddDocumentMenuProps = {
  patientId: string
  role: StaffRole | undefined
  onUpload: (folderName: string) => void
}

export function AddDocumentMenu({ patientId, role, onUpload }: AddDocumentMenuProps) {
  const { data: templates = [] } = useSWR('templates', listTemplates)
  // The type stays set while the picker fades out, so its list doesn't widen to every type mid-close.
  const [picker, setPicker] = useState<{ kind: TemplateKind; open: boolean } | null>(null)

  // A template item needs the right to create its type and at least one active template of it.
  const templateOptions = TEMPLATE_OPTIONS.filter(
    (option) =>
      role && canCreateKind(role, option.kind) && templates.some((t) => t.is_active && t.kind === option.kind),
  )
  const uploadOptions = UPLOAD_OPTIONS.filter((o) => o.kind === null || (role && canCreateKind(role, o.kind)))

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button disabled={!role} />}>
          <PlusIcon aria-hidden="true" />
          Add document
          <ChevronDownIcon aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-64">
          {templateOptions.map((option) => (
            <DropdownMenuItem key={option.kind} onClick={() => setPicker({ kind: option.kind, open: true })}>
              <option.icon className="text-muted-foreground" />
              {option.label}
            </DropdownMenuItem>
          ))}
          {templateOptions.length > 0 && <DropdownMenuSeparator />}
          {uploadOptions.map((option) => (
            <DropdownMenuItem key={option.key} onClick={() => onUpload(option.folderName)}>
              <UploadIcon className="text-muted-foreground" />
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <TemplatePickerDialog
        patientId={picker?.open ? patientId : null}
        kinds={picker ? [picker.kind] : undefined}
        onClose={() => setPicker((prev) => prev && { ...prev, open: false })}
      />
    </>
  )
}
