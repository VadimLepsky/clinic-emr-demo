'use client'

import { useId, useRef, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { Loader2Icon, PlusIcon, Trash2Icon, UploadIcon } from 'lucide-react'
import {
  createLetterhead,
  deleteLetterhead,
  getClinicSettings,
  getLetterheadUsage,
  listLetterheads,
  setDefaultLetterhead,
  updateLetterhead,
  updatePrescriptionBlank,
} from '@/lib/data'
import type { ClinicSettings, Letterhead, LetterheadKind } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import { LetterheadPreview } from '@/components/document-sheet/letterhead-preview'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg']
const MAX_BYTES = 5 * 1024 * 1024
const IMAGE_HINT = 'PNG or JPG, as wide as an A4 sheet'

const copy: Record<
  LetterheadKind,
  { title: string; description: string; add: string; newTitle: string; empty: string; afterDelete: string }
> = {
  header: {
    title: 'Headers',
    description: 'The top of an A4 sheet. A template picks its own; new templates and documents without a template get the default header.',
    add: 'Add header',
    newTitle: 'New header',
    empty: `Upload a letterhead header (${IMAGE_HINT})`,
    afterDelete: 'will print with the default header',
  },
  footer: {
    title: 'Footers',
    description: 'The bottom of an A4 sheet, under the signature. Chosen in the template.',
    add: 'Add footer',
    newTitle: 'New footer',
    empty: `Upload a letterhead footer (${IMAGE_HINT})`,
    afterDelete: 'will print without a footer',
  },
}

/** PNG / JPG up to 5 MB as a data URL (mocks; Supabase Storage later). */
function readImage(file: File): Promise<string> {
  if (!ACCEPTED_TYPES.includes(file.type)) return Promise.reject(new Error('PNG and JPG are supported'))
  if (file.size > MAX_BYTES) return Promise.reject(new Error('The file is too large: 5 MB at most'))
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the file'))
    reader.readAsDataURL(file)
  })
}

// Template headers/footers change when a letterhead is deleted, so templates are refreshed with the library.
function useRefreshLetterheads() {
  const { mutate } = useSWRConfig()
  return () =>
    mutate(
      (key) =>
        key === 'letterheads' ||
        key === 'letterhead-usage' ||
        (typeof key === 'string' && key.startsWith('template')) ||
        (Array.isArray(key) && typeof key[0] === 'string' && key[0].startsWith('template')),
    )
}

export function LetterheadsSettings() {
  const { data: letterheads } = useSWR('letterheads', listLetterheads)
  const { data: usage } = useSWR('letterhead-usage', getLetterheadUsage)
  const { data: clinicSettings } = useSWR('clinic-settings', getClinicSettings)

  return (
    <div className="flex flex-col gap-6">
      {(['header', 'footer'] as const).map((kind) => (
        <LetterheadList
          key={kind}
          kind={kind}
          letterheads={letterheads?.filter((l) => l.kind === kind)}
          usage={usage ?? {}}
        />
      ))}
      <PrescriptionBlank clinicSettings={clinicSettings} />
    </div>
  )
}

const blankSlots = [
  { key: 'prescription_header_image_url', label: 'Header', alt: 'Orders header' },
  { key: 'prescription_footer_image_url', label: 'Footer', alt: 'Orders footer' },
] as const

/** «Orders letterhead»: the orders' own header and footer — just images, separate from the library. */
function PrescriptionBlank({ clinicSettings }: { clinicSettings: ClinicSettings | undefined }) {
  const { mutate } = useSWRConfig()
  const fileRef = useRef<HTMLInputElement>(null)
  const [target, setTarget] = useState<(typeof blankSlots)[number]['key'] | null>(null)

  const save = async (patch: Partial<ClinicSettings>, success: string) => {
    try {
      const result = await updatePrescriptionBlank(patch)
      await mutate('clinic-settings', result, { revalidate: false })
      toast.success(success)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save')
    }
  }

  const upload = async (file: File | undefined) => {
    const key = target
    setTarget(null)
    if (!file || !key) return
    try {
      await save({ [key]: await readImage(file) }, 'Image saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload the image')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <CardTitle>Orders letterhead</CardTitle>
          <CardDescription>Header and footer of printed orders — separate from the template letterheads.</CardDescription>
        </div>
      </CardHeader>
      {!clinicSettings ? (
        <div className="px-8 py-6">
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <CardContent className="grid items-start gap-6 lg:grid-cols-2">
          {blankSlots.map((slot) => {
            const src = clinicSettings[slot.key]
            const choose = () => {
              setTarget(slot.key)
              fileRef.current?.click()
            }
            return (
              <div key={slot.key} className="flex min-w-0 flex-col gap-2">
                <div className="flex min-h-8 flex-wrap items-center gap-2">
                  <p className="font-medium">{slot.label}</p>
                  {src && (
                    <div className="ml-auto flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={choose}>
                        <UploadIcon aria-hidden="true" />
                        Replace
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => save({ [slot.key]: null }, `${slot.label} removed`)}
                      >
                        <Trash2Icon aria-hidden="true" />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
                {src ? (
                  <LetterheadPreview src={src} alt={slot.alt} />
                ) : (
                  <button
                    type="button"
                    onClick={choose}
                    className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-8 text-center text-muted-foreground transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <UploadIcon className="size-5" aria-hidden="true" />
                    {`No ${slot.key === 'prescription_header_image_url' ? 'header' : 'footer'} — upload an image (${IMAGE_HINT})`}
                  </button>
                )}
              </div>
            )
          })}
        </CardContent>
      )}
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          void upload(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </Card>
  )
}

function LetterheadList({
  kind,
  letterheads,
  usage,
}: {
  kind: LetterheadKind
  letterheads: Letterhead[] | undefined
  usage: Record<string, { id: string; name: string }[]>
}) {
  const text = copy[kind]
  const refresh = useRefreshLetterheads()
  const replaceRef = useRef<HTMLInputElement>(null)
  const [replacing, setReplacing] = useState<Letterhead | null>(null)
  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState<Letterhead | null>(null)
  const [deleting, setDeleting] = useState<Letterhead | null>(null)

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action()
      await refresh()
      toast.success(success)
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save')
      return false
    }
  }

  const replaceImage = async (file: File | undefined) => {
    const target = replacing
    setReplacing(null)
    if (!file || !target) return
    try {
      const image_url = await readImage(file)
      await run(() => updateLetterhead(target.id, { image_url }), 'Image replaced')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload the image')
    }
  }


  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <CardTitle>{text.title}</CardTitle>
          <CardDescription>{text.description}</CardDescription>
        </div>
        <Button onClick={() => setAdding(true)}>
          <PlusIcon aria-hidden="true" />
          {text.add}
        </Button>
      </CardHeader>

      {!letterheads ? (
        <div className="px-8 py-6">
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {letterheads.map((letterhead) => {
            const used = usage[letterhead.id] ?? []
            // Where it is used: «default», «template: …».
            const uses = [
              ...(letterhead.is_default ? ['default'] : []),
              ...(used.length > 0
                ? [`${used.length === 1 ? 'template' : 'templates'}: ${used.map((t) => t.name).join(', ')}`]
                : []),
            ]
            return (
              <li key={letterhead.id} className="flex flex-col gap-3 px-8 py-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="font-semibold">{letterhead.name}</p>
                    <p className="text-sm text-muted-foreground">{uses.length ? uses.join(' · ') : 'Not used'}</p>
                  </div>
                  <div className="ml-auto flex flex-wrap items-center gap-1">
                    {kind === 'header' && !letterhead.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          run(() => setDefaultLetterhead(letterhead.id), `«${letterhead.name}» is now the default header`)
                        }
                      >
                        Make default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReplacing(letterhead)
                        replaceRef.current?.click()
                      }}
                    >
                      <UploadIcon aria-hidden="true" />
                      Replace image
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setRenaming(letterhead)}>
                      Rename
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleting(letterhead)}
                      aria-label={`Delete: ${letterhead.name}`}
                    >
                      <Trash2Icon aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                <LetterheadPreview src={letterhead.image_url} alt={letterhead.name} />
              </li>
            )
          })}
          {letterheads.length === 0 && (
            <li className="px-8 py-5">
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-8 text-center text-muted-foreground transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <UploadIcon className="size-5" aria-hidden="true" />
                {text.empty}
              </button>
            </li>
          )}
        </ul>
      )}

      <input
        ref={replaceRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          void replaceImage(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <AddLetterheadDialog
        kind={kind}
        open={adding}
        onOpenChange={setAdding}
        onCreate={(input) => run(() => createLetterhead({ kind, ...input }), 'Letterhead added')}
      />
      <RenameDialog
        letterhead={renaming}
        onClose={() => setRenaming(null)}
        onRename={(id, name) => run(() => updateLetterhead(id, { name }), 'Name changed')}
      />
      <DeleteDialog
        letterhead={deleting}
        usedIn={deleting ? (usage[deleting.id] ?? []) : []}
        afterDelete={text.afterDelete}
        onClose={() => setDeleting(null)}
        onDelete={(id) => run(() => deleteLetterhead(id), 'Letterhead deleted')}
      />
    </Card>
  )
}

function AddLetterheadDialog({
  kind,
  open,
  onOpenChange,
  onCreate,
}: {
  kind: LetterheadKind
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (input: { name: string; image_url: string }) => Promise<boolean>
}) {
  const id = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const reset = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      setName('')
      setImage(null)
    }
  }

  const pickFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setImage(await readImage(file))
      // The file name is a fair first guess for the name.
      if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, ''))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload the image')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!image || !name.trim()) return
    setSaving(true)
    const ok = await onCreate({ name, image_url: image })
    setSaving(false)
    if (ok) reset(false)
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>{copy[kind].newTitle}</DialogTitle>
            <DialogDescription>{`${IMAGE_HINT}: 2000 px wide or more, so it prints sharp.`}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-name`}>Name</Label>
              <Input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-file`}>Image</Label>
              <input
                ref={fileRef}
                id={`${id}-file`}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                className="sr-only"
                onChange={(e) => {
                  void pickFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              {image ? (
                <>
                  <LetterheadPreview src={image} alt={name} />
                  <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => fileRef.current?.click()}>
                    <UploadIcon aria-hidden="true" />
                    Replace
                  </Button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-8 text-center text-muted-foreground transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <UploadIcon className="size-5" aria-hidden="true" />
                  {copy[kind].empty}
                </button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => reset(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !image || !name.trim()}>
              {saving && <Loader2Icon className="animate-spin" aria-hidden="true" />}
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RenameDialog({
  letterhead,
  onClose,
  onRename,
}: {
  letterhead: Letterhead | null
  onClose: () => void
  onRename: (id: string, name: string) => Promise<boolean>
}) {
  return (
    <Dialog open={letterhead !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {letterhead && <RenameForm key={letterhead.id} letterhead={letterhead} onClose={onClose} onRename={onRename} />}
      </DialogContent>
    </Dialog>
  )
}

function RenameForm({
  letterhead,
  onClose,
  onRename,
}: {
  letterhead: Letterhead
  onClose: () => void
  onRename: (id: string, name: string) => Promise<boolean>
}) {
  const id = useId()
  const [name, setName] = useState(letterhead.name)
  const [saving, setSaving] = useState(false)
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={async (e) => {
        e.preventDefault()
        setSaving(true)
        const ok = await onRename(letterhead.id, name)
        setSaving(false)
        if (ok) onClose()
      }}
    >
      <DialogHeader>
        <DialogTitle>Rename</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-name`}>Name</Label>
        <Input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !name.trim()}>
          Save
        </Button>
      </DialogFooter>
    </form>
  )
}

function DeleteDialog({
  letterhead,
  usedIn,
  afterDelete,
  onClose,
  onDelete,
}: {
  letterhead: Letterhead | null
  usedIn: { id: string; name: string }[]
  afterDelete: string
  onClose: () => void
  onDelete: (id: string) => Promise<boolean>
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Dialog open={letterhead !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{`Delete «${letterhead?.name ?? ''}»?`}</DialogTitle>
          <DialogDescription>
            {usedIn.length > 0
              ? `Used in templates: ${usedIn.map((t) => `«${t.name}»`).join(', ')}. After deleting, they ${afterDelete}.`
              : 'Not used in any template.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              if (!letterhead) return
              setBusy(true)
              const ok = await onDelete(letterhead.id)
              setBusy(false)
              if (ok) onClose()
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
