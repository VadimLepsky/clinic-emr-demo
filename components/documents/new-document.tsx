'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { canCreateKind, getCurrentUser, getTemplateVersion, listTemplates } from '@/lib/data'
import type { Patient, TemplateKind } from '@/lib/types'
import { Page, PageHeader } from '@/components/app-shell/page'
import { useEditorLayout } from '@/components/consultation/use-editor-layout'
import { EditorLayoutToggle } from '@/components/consultation/editor-layout-toggle'
import { ConsultationEditor } from '@/components/consultation/consultation-editor'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { getInitialValues } from '@/components/template-form/utils'
import { todayIso } from './format'
import { TemplatePickerDialog } from './template-picker-dialog'

const newDocumentTitles: Record<TemplateKind, string> = {
  consultation: 'New visit note',
  ultrasound: 'New ultrasound report',
  lab: 'New lab results',
  certificate: 'New letter or form',
  other: 'New document',
}

/**
 * A new document from the template in `?template=<id>` only: no automatic choice. Without a usable template the
 * picker opens at once and no form is drawn. The document's type is the template's.
 */
export function NewDocument({
  patient,
  templateId,
}: {
  patient: Patient
  templateId: string | null
}) {
  const router = useRouter()
  const [editorLayout, setEditorLayout] = useEditorLayout()
  const [documentDate] = useState(todayIso)
  const [dirty, setDirty] = useState(false)
  // 'auto': the picker opens by itself while there is no usable template; after that only on request.
  const [picker, setPicker] = useState<'auto' | 'open' | 'closed'>('auto')
  const [confirmChange, setConfirmChange] = useState(false)

  const { data: currentUser } = useSWR('current-user', getCurrentUser)
  // Templates come from the client too: one made in the builder exists only in client memory (mocks).
  const { data: templates } = useSWR('templates', listTemplates)
  const template = templates?.find((t) => t.id === templateId && t.is_active)
  const allowed = Boolean(template && currentUser && canCreateKind(currentUser.role, template.kind))
  const pickerOpen = picker === 'open' || (picker === 'auto' && Boolean(templates && currentUser && !template))

  // With unsaved input, switching the template asks first; the picker then opens.
  const changeTemplate = () => (dirty ? setConfirmChange(true) : setPicker('open'))

  const { data: version } = useSWR(
    template && allowed ? ['template-version', template.current_version_id] : null,
    ([, id]) => getTemplateVersion(id),
  )

  const patientHref = `/patients/${patient.id}`

  return (
    <Page>
      <PageHeader
        back={{ href: patientHref, label: 'Back to patient documents' }}
        title={patient.full_name}
        // The template's name is text under the title (no dropdown): next to the actions it squeezed the patient's
        // name onto two lines.
        description={
          template ? (
            <>
              {newDocumentTitles[template.kind]} · template{' '}
              <span className="font-medium text-foreground">«{template.name}»</span>
            </>
          ) : (
            'New document'
          )
        }
        actions={
          template && allowed ? (
            <>
              <EditorLayoutToggle value={editorLayout} onChange={setEditorLayout} />
              <Button variant="outline" onClick={changeTemplate}>
                Change template
              </Button>
            </>
          ) : undefined
        }
      />

      {!templates || !currentUser ? (
        <FormSkeleton />
      ) : !template ? (
        <EmptyState text={templateId ? 'Template not found or deactivated.' : 'Choose a template to start filling in.'}>
          <Button onClick={() => setPicker('open')}>Choose template</Button>
        </EmptyState>
      ) : !allowed ? (
        <EmptyState text="Your role cannot create documents of this kind.">
          <Button onClick={() => setPicker('open')}>Choose another template</Button>
        </EmptyState>
      ) : version === null ? (
        <EmptyState text="Could not load the template version." />
      ) : !version ? (
        <FormSkeleton />
      ) : (
        <ConsultationEditor
          key={version.id}
          layout={editorLayout}
          patient={patient}
          doctor={currentUser}
          templateVersion={version}
          title={template.name}
          documentDate={documentDate}
          documentNumber={null}
          template={template}
          initialValues={getInitialValues(version.schema, {
            patient,
            doctor: currentUser,
            documentDate,
            documentNumber: null,
          })}
          onSaved={(doc) => router.push(`/patients/${patient.id}/documents/${doc.id}`)}
          onCancel={() => router.push(patientHref)}
          onDirtyChange={setDirty}
        />
      )}

      <TemplatePickerDialog patientId={pickerOpen ? patient.id : null} onClose={() => setPicker('closed')} />

      <Dialog open={confirmChange} onOpenChange={setConfirmChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change template?</DialogTitle>
            <DialogDescription>What you have entered will be lost.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmChange(false)
                setPicker('open')
              }}
            >
              Change template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  )
}

function EmptyState({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-card px-8 py-12 text-center text-muted-foreground dark:border dark:border-border">
      {text}
      {children}
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
      <Skeleton className="hidden h-56 w-full rounded-2xl lg:block" />
    </div>
  )
}
