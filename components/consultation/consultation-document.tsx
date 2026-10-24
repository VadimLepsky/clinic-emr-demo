'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { ChevronRightIcon, PencilIcon, PrinterIcon } from 'lucide-react'
import {
  canCreateKind,
  getCurrentUser,
  getDocument,
  getPrescriptionByDocument,
  getTemplateByVersion,
  getTemplateVersion,
  listLetterheads,
  listStaff,
  logPrint,
} from '@/lib/data'
import type { Patient } from '@/lib/types'
import { Page, PageHeader } from '@/components/app-shell/page'
import { Button } from '@/components/ui/button'
import { DocumentSheet } from '@/components/document-sheet/document-sheet'
import { SheetBackdrop } from '@/components/document-sheet/sheet-backdrop'
import { formatDate } from '@/components/documents/format'
import { formatMoney } from '@/lib/format'
import { ConsultationEditor } from './consultation-editor'
import { FormSkeleton } from '@/components/documents/new-document'
import { useSelectedServices } from './use-selected-services'
import { useEditorLayout } from './use-editor-layout'
import { EditorLayoutToggle } from './editor-layout-toggle'

type ConsultationDocumentProps = {
  patient: Patient
  documentId: string
}

export function ConsultationDocument({ patient, documentId }: ConsultationDocumentProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [editorLayout, setEditorLayout] = useEditorLayout()
  const { data: document, mutate } = useSWR(['document', documentId], ([, id]) => getDocument(id))
  const { data: version } = useSWR(
    document?.template_version_id ? ['template-version', document.template_version_id] : null,
    ([, id]) => getTemplateVersion(id),
  )
  const { data: template } = useSWR(
    document?.template_version_id ? ['template-by-version', document.template_version_id] : null,
    ([, id]) => getTemplateByVersion(id),
  )
  const { data: staff } = useSWR('staff', listStaff)
  const { data: letterheads } = useSWR('letterheads', listLetterheads)
  const { data: currentUser } = useSWR('current-user', getCurrentUser)
  const { data: prescription, mutate: mutatePrescription } = useSWR(
    ['prescription-by-document', documentId],
    ([, id]) => getPrescriptionByDocument(id),
  )
  const services = useSelectedServices(version?.schema, document?.values ?? undefined)

  const handlePrint = () => {
    void logPrint('document', documentId, patient.id)
    window.print()
  }

  const back = { href: `/patients/${patient.id}`, label: 'Back to patient documents' }

  if (document === null || (document && (document.patient_id !== patient.id || document.kind !== 'template'))) {
    return (
      <Page>
        <PageHeader back={back} title="Document not found" />
      </Page>
    )
  }

  const author = staff?.find((s) => s.id === document?.author_id)
  const doctor = author ?? currentUser
  // The template (or null for a lost one) gives the editor its type, for the wording of its messages.
  const ready = document && version && doctor && template !== undefined && letterheads
  // Editing takes the same right as creating a document of this type (canCreateKind): front desk and the contact
  // centre only view and print.
  const mayEdit = Boolean(template && currentUser && canCreateKind(currentUser.role, template.kind))

  return (
    <Page>
      <PageHeader
        className="print:hidden"
        back={back}
        title={
          document ? (
            document.title
          ) : (
            <span aria-hidden="true" className="inline-block h-9 w-80 animate-pulse rounded-md bg-muted align-middle" />
          )
        }
        description={
          document && (
            <dl className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <div className="flex gap-1">
                <dt>Patient:</dt>
                <dd className="text-foreground">{patient.full_name}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Date:</dt>
                <dd className="text-foreground tabular-nums">{formatDate(document.document_date)}</dd>
              </div>
              {document.number && (
                <div className="flex gap-1">
                  <dt>Number:</dt>
                  <dd className="text-foreground tabular-nums">{document.number}</dd>
                </div>
              )}
              <div className="flex gap-1">
                <dt>Author:</dt>
                <dd className="text-foreground">{author?.full_name ?? '—'}</dd>
              </div>
            </dl>
          )
        }
        actions={
          mode === 'edit' ? (
            <EditorLayoutToggle value={editorLayout} onChange={setEditorLayout} />
          ) : (
            <>
              {mayEdit && (
                <Button onClick={() => setMode('edit')} disabled={!ready}>
                  <PencilIcon className="size-4" aria-hidden="true" />
                  Edit
                </Button>
              )}
              <Button variant="outline" onClick={handlePrint} disabled={!ready}>
                <PrinterIcon className="size-4" aria-hidden="true" />
                Print
              </Button>
            </>
          )
        }
      />

      {document && document.template_version_id && version === null ? (
        <div className="rounded-2xl bg-card px-8 py-12 text-center text-muted-foreground dark:border dark:border-border">
          Could not load the template version of this document.
        </div>
      ) : !ready ? (
        <FormSkeleton />
      ) : mode === 'edit' ? (
        <>
          <ConsultationEditor
            layout={editorLayout}
            servicesLocked={Boolean(prescription?.locked_at)}
            patient={patient}
            doctor={doctor}
            templateVersion={version}
            template={template ?? undefined}
            title={document.title}
            documentId={document.id}
            documentDate={document.document_date}
            documentNumber={document.number}
            initialValues={document.values ?? {}}
            onSaved={(saved) => {
              mutate({ ...saved }, { revalidate: false })
              mutatePrescription()
              setMode('view')
              window.scrollTo({ top: 0 })
            }}
            onCancel={() => setMode('view')}
          />
        </>
      ) : (
        <>
          {prescription && (
            <Link
              href={`/patients/${patient.id}?tab=prescriptions`}
              className="flex items-center gap-3 rounded-2xl bg-card px-8 py-5 text-card-foreground transition-colors hover:bg-muted print:hidden dark:border dark:border-border"
            >
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold">Care plan:</span>
                {` ${prescription.title} · ${formatMoney(prescription.total_amount)} · ${prescription.completion_pct}% completed`}
              </span>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          )}
          <SheetBackdrop>
            <DocumentSheet
              schema={version.schema}
              values={document.values ?? {}}
              patient={patient}
              doctor={doctor}
              title={document.title}
              documentDate={document.document_date}
              documentNumber={document.number}
              letterheads={letterheads}
              requisites={template ?? undefined}
              services={services}
            />
          </SheetBackdrop>
        </>
      )}
    </Page>
  )
}
