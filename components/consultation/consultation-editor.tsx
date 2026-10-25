'use client'

import { useEffect, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { Loader2Icon } from 'lucide-react'
import { listLetterheads, listServicePackages, saveDocument, searchServices } from '@/lib/data'
import type {
  DocumentValues,
  FieldValue,
  MedDocument,
  Patient,
  Staff,
  Template,
  TemplateVersion,
} from '@/lib/types'
import { DocumentSheet } from '@/components/document-sheet/document-sheet'
import { SheetBackdrop } from '@/components/document-sheet/sheet-backdrop'
import type { EditorLayout } from './use-editor-layout'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TemplateForm } from '@/components/template-form/template-form'
import { fieldElementId, fieldNames, findMissingRequired, getSelectedServices } from '@/components/template-form/utils'
import { DocumentStructure } from './document-structure'
import { useSelectedServices } from './use-selected-services'
import { useUnsavedChanges } from './use-unsaved-changes'

type ConsultationEditorProps = {
  patient: Patient
  doctor: Staff
  templateVersion: TemplateVersion
  template?: Template
  title: string
  documentId?: string
  documentDate: string
  documentNumber: string | null
  initialValues: DocumentValues
  onSaved: (document: MedDocument) => void
  onCancel: () => void
  layout: EditorLayout
  /** The prescription made from this document is paid: services are read-only and not saved. */
  servicesLocked?: boolean
  /** Unsaved changes appear or go (the new-document page asks before switching the template). */
  onDirtyChange?: (dirty: boolean) => void
}

export function ConsultationEditor({
  layout,
  servicesLocked = false,
  patient,
  doctor,
  templateVersion,
  template,
  title,
  documentId,
  documentDate,
  documentNumber,
  initialValues,
  onSaved,
  onCancel,
  onDirtyChange,
}: ConsultationEditorProps) {
  const { mutate } = useSWRConfig()
  const schema = templateVersion.schema
  const [values, setValues] = useState<DocumentValues>(initialValues)
  const [dirty, setDirty] = useState(false)
  const [invalidIds, setInvalidIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const { data: allPackages = [] } = useSWR('service-packages', listServicePackages)
  const { data: letterheads = [] } = useSWR('letterheads', listLetterheads)
  // Only the packages chosen in the template become buttons; none chosen — no packages row.
  const servicePackages = allPackages.filter((pkg) => template?.package_ids.includes(pkg.id))
  const packageServiceIds = servicePackages.flatMap((pkg) => pkg.items.map((item) => item.service_id))
  const services = useSelectedServices(schema, values, packageServiceIds)
  const { isPromptOpen, requestLeave, confirmLeave, cancelLeave } = useUnsavedChanges(dirty && !saving)
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange])
  // Any template type is edited here; only a consultation is a «visit note».
  const isConsultation = !template || template.kind === 'consultation'
  const savedLabel = isConsultation ? 'Visit note saved' : 'Document saved'

  const handleChange = (blockId: string, value: FieldValue) => {
    setValues((prev) => ({ ...prev, [blockId]: value }))
    setDirty(true)
    setInvalidIds((prev) => (prev.includes(blockId) ? prev.filter((id) => id !== blockId) : prev))
  }

  const handleSave = async () => {
    const missing = findMissingRequired(schema, values)
    if (missing.length) {
      setInvalidIds(missing)
      const el = document.getElementById(fieldElementId(missing[0]))
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus({ preventScroll: true })
      const names = fieldNames(schema)
      toast.error(`Fill in the required fields: ${missing.map((id) => names.get(id) ?? id).join(', ')}`)
      return
    }

    setSaving(true)
    try {
      const result = await saveDocument({
        documentId,
        patientId: patient.id,
        templateVersionId: templateVersion.id,
        title,
        values,
      })
      setDirty(false)
      await mutate(
        (key) =>
          Array.isArray(key) &&
          (((key[0] === 'documents' || key[0] === 'folder-counts') && key[1] === patient.id) ||
            (key[0] === 'document' && key[1] === result.document.id)),
      )

      // With a paid prescription the services were read-only, so there is nothing to warn about.
      if (!result.prescriptionLocked && result.prescriptionId && getSelectedServices(schema, values).length > 0) {
        toast.success(`${savedLabel}. Orders created`)
      } else {
        toast.success(savedLabel)
      }
      onSaved(result.document)
    } catch {
      toast.error(`Could not save the ${isConsultation ? 'visit note' : 'document'}. Please try again.`)
      setSaving(false)
    }
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
          className="min-w-0"
          id="consultation-form"
        >
          {layout === 'document' ? (
            <SheetBackdrop>
              <DocumentSheet
                schema={schema}
                values={values}
                onChange={handleChange}
                patient={patient}
                doctor={doctor}
                title={title}
                documentDate={documentDate}
                documentNumber={documentNumber}
                letterheads={letterheads}
                requisites={template}
                services={services}
                servicePackages={servicePackages}
                onSearchServices={searchServices}
                mode="edit"
                invalidFieldIds={invalidIds}
                lockedServices={servicesLocked}
              />
            </SheetBackdrop>
          ) : (
            <TemplateForm
              schema={schema}
              values={values}
              onChange={handleChange}
              context={{ patient, doctor, documentDate, documentNumber }}
              mode="edit"
              services={services}
              servicePackages={servicePackages}
              onSearchServices={searchServices}
              invalidFieldIds={invalidIds}
              lockedServices={servicesLocked}
            />
          )}
        </form>
        <aside className="hidden lg:block">
          <div className="sticky top-10">
            <DocumentStructure key={layout} sections={schema.sections} />
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-10 mt-2 border-t border-border bg-canvas/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 md:-mx-10 md:px-10 supports-backdrop-filter:bg-canvas/80">
        <div className="flex items-center justify-end gap-2">
          {dirty && <span className="mr-auto text-sm text-muted-foreground">Unsaved changes</span>}
          <Button type="button" variant="outline" onClick={() => requestLeave(onCancel)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="consultation-form" disabled={saving}>
            {saving && <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />}
            Save
          </Button>
        </div>
      </div>

      <Dialog open={isPromptOpen} onOpenChange={(open) => !open && cancelLeave()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDescription>
              Changes to the {isConsultation ? 'visit note' : 'document'} are not saved. Leave without saving?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelLeave}>
              Stay
            </Button>
            <Button variant="destructive" onClick={confirmLeave}>
              Leave without saving
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
