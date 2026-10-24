'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR, { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { EyeIcon, HistoryIcon, SaveIcon } from 'lucide-react'
import { defaultFolderForKind, listFolders, saveTemplate } from '@/lib/data'
import type { Section, TemplateKind, TemplateSchema } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Page, PageHeader } from '@/components/app-shell/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUnsavedChanges } from '@/components/consultation/use-unsaved-changes'
import {
  collectIds,
  createId,
  createRecommendationsSection,
  errorElementId,
  kindOptions,
  RECOMMENDATION_IDS,
  validateTemplate,
  type TemplateMeta,
} from './builder-utils'
import { PackagesField } from './packages-field'
import { PreviewDialog } from './preview-dialog'
import { RequisitesCard } from './requisites-card'
import { SectionCard } from './section-card'
import { scrollToSection, StructurePanel } from './structure-panel'
import { VersionHistorySheet } from './version-history-sheet'

type TemplateEditorProps = {
  templateId?: string
  version: number | null
  initialMeta: TemplateMeta
  initialSchema: TemplateSchema
}

export function TemplateEditor({ templateId, version, initialMeta, initialSchema }: TemplateEditorProps) {
  const router = useRouter()
  const { mutate } = useSWRConfig()
  const { data: folders } = useSWR('folders', listFolders)

  const [meta, setMeta] = useState<TemplateMeta>(initialMeta)
  const [schema, setSchema] = useState<TemplateSchema>(initialSchema)
  const [dirty, setDirty] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [folderPicked, setFolderPicked] = useState(false)

  const errors = useMemo(() => (showErrors ? validateTemplate(meta, schema) : {}), [showErrors, meta, schema])
  const { isPromptOpen, confirmLeave, cancelLeave } = useUnsavedChanges(dirty && !saving)

  const kindFolderId = (kind: TemplateKind) => (folders && defaultFolderForKind(folders, kind)?.id) || ''
  const folderId = meta.folder_id || kindFolderId(meta.kind) || folders?.[0]?.id || ''
  const folderItems = (folders ?? []).map((f) => ({ value: f.id, label: f.name }))
  const hasRecommendations = collectIds(schema).some((id) => (RECOMMENDATION_IDS as readonly string[]).includes(id))

  const patchMeta = (patch: Partial<TemplateMeta>) => {
    setMeta((prev) => ({ ...prev, ...patch }))
    setDirty(true)
  }
  // The folder follows the type until it is picked by hand: a new template has none yet, a saved one follows only
  // while it is in its type's default folder.
  const changeKind = (kind: TemplateKind) => {
    const followsKind = !folderPicked && (!meta.folder_id || meta.folder_id === kindFolderId(meta.kind))
    patchMeta(followsKind ? { kind, folder_id: kindFolderId(kind) } : { kind })
  }
  const pickFolder = (folder_id: string) => {
    setFolderPicked(true)
    patchMeta({ folder_id })
  }
  const setSections = (sections: Section[]) => {
    setSchema({ sections })
    setDirty(true)
  }
  const newBlockId = () => createId('f', schema)

  const addSection = (section: Section) => {
    setSections([...schema.sections, section])
    requestAnimationFrame(() => scrollToSection(section.id))
  }

  const handleSave = async () => {
    const found = validateTemplate(meta, schema)
    const firstKey = Object.keys(found)[0]
    if (firstKey) {
      setShowErrors(true)
      toast.error('Fix the errors in the template')
      requestAnimationFrame(() => {
        const el = document.getElementById(errorElementId(firstKey))
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el?.focus({ preventScroll: true })
      })
      return
    }
    if (!folderId) {
      toast.error('Choose a folder')
      return
    }

    setSaving(true)
    try {
      const saved = await saveTemplate({
        templateId,
        name: meta.name.trim(),
        kind: meta.kind,
        specialty: meta.specialty?.trim() || null,
        folder_id: folderId,
        header_id: meta.header_id,
        footer_id: meta.footer_id,
        footer_text: meta.footer_text?.trim() ? meta.footer_text : null,
        show_signature: meta.show_signature,
        banner_image_url: meta.banner_image_url,
        footer_image_url: meta.footer_image_url,
        package_ids: meta.package_ids,
        schema,
      })
      setDirty(false)
      setShowErrors(false)
      await mutate(
        (key) =>
          (typeof key === 'string' && key.startsWith('templates')) ||
          (Array.isArray(key) && typeof key[0] === 'string' && key[0].startsWith('template')),
      )
      toast.success('Template saved as a new version')
      if (!templateId) router.replace(`/templates/${saved.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the template')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page>
      <PageHeader
        back={{ href: '/templates', label: 'Templates' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {templateId ? 'Edit template' : 'New template'}
            <Badge variant="secondary">{`Version ${version ?? 1}`}</Badge>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            Existing documents won&apos;t change
            {dirty && (
              <span className="rounded-md bg-status-warning-bg px-2 py-0.5 text-xs font-medium text-status-warning-fg">
                Unsaved changes
              </span>
            )}
          </span>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setVersionsOpen(true)}>
              <HistoryIcon aria-hidden="true" />
              Version history
            </Button>
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              <EyeIcon aria-hidden="true" />
              Preview
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <SaveIcon aria-hidden="true" />
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Template settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor={errorElementId('name')}>
                Template name <span className="text-destructive">*</span>
              </Label>
              <Input
                id={errorElementId('name')}
                value={meta.name}
                aria-invalid={Boolean(errors.name)}
                onChange={(e) => patchMeta({ name: e.target.value })}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tb-kind">Kind</Label>
              <Select items={kindOptions} value={meta.kind} onValueChange={(v) => v && changeKind(v as TemplateKind)}>
                <SelectTrigger id="tb-kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {kindOptions.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tb-specialty">Specialty</Label>
              <Input
                id="tb-specialty"
                placeholder="E.g. General practitioner"
                value={meta.specialty ?? ''}
                onChange={(e) => patchMeta({ specialty: e.target.value || null })}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="tb-folder">Folder</Label>
              <Select items={folderItems} value={folderId} onValueChange={(v) => v && pickFolder(v as string)}>
                <SelectTrigger id="tb-folder" className="w-full">
                  <SelectValue placeholder="Choose a folder" />
                </SelectTrigger>
                <SelectContent>
                  {folderItems.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">Where documents from this template go</p>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="tb-packages">Service bundles in this template</Label>
              <PackagesField id="tb-packages" value={meta.package_ids} onChange={(package_ids) => patchMeta({ package_ids })} />
              <p className="text-sm text-muted-foreground">
                Bundle buttons while filling in a document. If none is chosen, there is no bundle row.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="order-2 flex min-w-0 flex-col gap-6 lg:order-1">
          <RequisitesCard meta={meta} onChange={patchMeta} />
          {schema.sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              errors={errors}
              createId={newBlockId}
              onChange={(next) => setSections(schema.sections.map((s) => (s.id === next.id ? next : s)))}
              onDelete={() => setSections(schema.sections.filter((s) => s.id !== section.id))}
            />
          ))}
        </div>
        <aside className="order-1 lg:order-2 lg:sticky lg:top-10">
          <StructurePanel
            sections={schema.sections}
            onReorder={setSections}
            onAddEmpty={() => addSection({ id: createId('sec', schema), title: '', blocks: [] })}
            onAddRecommendations={() => addSection(createRecommendationsSection(createId('sec', schema)))}
            recommendationsDisabled={hasRecommendations}
          />
        </aside>
      </div>

      <PreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        meta={meta}
        schema={schema}
      />

      <VersionHistorySheet
        open={versionsOpen}
        onOpenChange={setVersionsOpen}
        templateId={templateId}
        meta={meta}
      />

      <Dialog open={isPromptOpen} onOpenChange={(open) => !open && cancelLeave()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDescription>Changes to the template are not saved. Leave without saving?</DialogDescription>
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
    </Page>
  )
}
