'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { XIcon } from 'lucide-react'
import { getTemplatePreviewContext, listLetterheads } from '@/lib/data'
import type { TemplateSchema } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { DocumentSheet } from '@/components/document-sheet/document-sheet'
import { SheetBackdrop } from '@/components/document-sheet/sheet-backdrop'
import type { TemplateMeta } from './builder-utils'

type PreviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  meta: TemplateMeta
  schema: TemplateSchema
}

const today = () => new Date().toISOString().slice(0, 10)

// A mockup of the document, not a form: read-only sheet in mock mode (skeleton bars instead of values)
// on light .paper, with test patient data in the header block.
export function PreviewDialog({ open, onOpenChange, meta, schema }: PreviewDialogProps) {
  const [documentDate] = useState(today)
  const { data: letterheads } = useSWR('letterheads', listLetterheads)
  const { data: context } = useSWR(open ? ['template-preview-context', meta.specialty ?? ''] : null, ([, s]) =>
    getTemplatePreviewContext(s || null),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92svh] flex-col gap-0 sm:max-w-[min(64rem,calc(100vw-2rem))]"
      >
        <DialogHeader className="-mx-8 -mt-8 flex-row items-center justify-between gap-4 rounded-t-2xl bg-background px-8 py-6">
          <DialogTitle className="text-2xl">Попередній перегляд</DialogTitle>
          <DialogClose render={<Button variant="ghost" size="icon-sm" />}>
            <XIcon aria-hidden="true" />
            <span className="sr-only">Закрити</span>
          </DialogClose>
        </DialogHeader>
        <SheetBackdrop variant="dialog">
          {open && context && letterheads ? (
            <DocumentSheet
              className="paper bg-background"
              mode="view"
              mock
              title={meta.name.trim() || 'Без назви'}
              schema={schema}
              values={{}}
              patient={context.patient}
              doctor={context.doctor}
              documentDate={documentDate}
              documentNumber="КВ-000000"
              letterheads={letterheads}
              requisites={meta}
              services={[]}
            />
          ) : (
            <Skeleton className="mx-auto h-[60svh] w-full max-w-[210mm]" />
          )}
        </SheetBackdrop>
      </DialogContent>
    </Dialog>
  )
}
