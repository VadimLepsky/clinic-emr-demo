'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileTextIcon, ImageIcon, PaperclipIcon } from 'lucide-react'
import type { FileRecord, Folder, MedDocument, Staff } from '@/lib/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatDateTime, isImage } from './format'

type DocumentTableProps = {
  patientId: string
  documents: MedDocument[]
  folders: Folder[]
  staff: Staff[]
  /** Files of upload documents by document id; a missing key means the list is still loading. */
  files: Record<string, FileRecord[]>
}

export function DocumentTable({ patientId, documents, folders, staff, files }: DocumentTableProps) {
  const router = useRouter()
  const folderName = new Map(folders.map((f) => [f.id, f.name]))
  const staffName = new Map(staff.map((s) => [s.id, s.full_name]))

  // Upload documents open their (first) file in a new tab; without files the row is not clickable.
  const openDocument = (doc: MedDocument) => {
    if (doc.kind === 'template') return router.push(`/patients/${patientId}/documents/${doc.id}`)
    const first = files[doc.id]?.[0]
    if (first) window.open(first.url, '_blank', 'noopener')
  }
  const isClickable = (doc: MedDocument) => doc.kind === 'template' || (files[doc.id]?.length ?? 0) > 0

  return (
    <Table>
      <TableHeader className="[&_tr]:border-b-0">
        <TableRow className="border-b-0 hover:bg-transparent">
          <TableHead>Document</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Created on</TableHead>
          <TableHead>Created by</TableHead>
          <TableHead>Folder</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow
            key={doc.id}
            onClick={isClickable(doc) ? () => openDocument(doc) : undefined}
            className={isClickable(doc) ? 'cursor-pointer border-b-0' : 'border-b-0'}
          >
            <TableCell className="whitespace-normal">
              <div className="flex min-w-52 items-center gap-3">
                {doc.kind === 'template' ? (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                    <FileTextIcon className="size-4" aria-hidden="true" />
                    <span className="sr-only">Filled-in form</span>
                  </span>
                ) : (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                    <PaperclipIcon className="size-4" aria-hidden="true" />
                    <span className="sr-only">Uploaded file</span>
                  </span>
                )}
                {doc.kind === 'template' ? (
                  <Link
                    href={`/patients/${patientId}/documents/${doc.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className={titleLinkClass}
                  >
                    {doc.title}
                  </Link>
                ) : (
                  <UploadTitle doc={doc} files={files[doc.id]} />
                )}
              </div>
            </TableCell>
            <TableCell className="tabular-nums">{formatDate(doc.document_date)}</TableCell>
            <TableCell className="tabular-nums text-muted-foreground">{formatDateTime(doc.created_at)}</TableCell>
            <TableCell className="whitespace-normal">{doc.author_id ? (staffName.get(doc.author_id) ?? '—') : '—'}</TableCell>
            <TableCell className="whitespace-normal text-muted-foreground">{folderName.get(doc.folder_id) ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

const titleLinkClass = 'font-medium text-foreground underline-offset-4 hover:text-primary hover:underline'

// One file: the title itself opens it. Several: their names (links) under the title. None: muted note.
function UploadTitle({ doc, files }: { doc: MedDocument; files: FileRecord[] | undefined }) {
  if (files?.length === 1) {
    return (
      <a
        href={files[0].url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={titleLinkClass}
      >
        {doc.title}
      </a>
    )
  }
  if (!files || files.length === 0) {
    return (
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-medium">{doc.title}</span>
        {files && <span className="text-sm text-muted-foreground">no files</span>}
      </span>
    )
  }
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="font-medium">{doc.title}</span>
      <ul className="flex flex-col gap-0.5">
        {files.map((file) => (
          <li key={file.id} className="min-w-0">
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={file.file_name}
              className="flex max-w-72 min-w-0 items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              {isImage(file.mime_type) ? (
                <ImageIcon className="size-4 shrink-0" aria-hidden="true" />
              ) : (
                <FileTextIcon className="size-4 shrink-0" aria-hidden="true" />
              )}
              <span className="truncate">{file.file_name}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
