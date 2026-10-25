'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import useSWR, { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { Loader2Icon, PlusIcon, Trash2Icon } from 'lucide-react'
import { createFolder, deleteFolder, getFolderUsage, listFolders, reorderFolders, updateFolder } from '@/lib/data'
import type { FolderUsage } from '@/lib/data'
import type { Folder } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DragHandle, SortableList } from '@/components/template-builder/sortable-list'

const noUsage: FolderUsage = { documents: 0, templates: [] }

function deleteBlockReason(usage: FolderUsage): string | null {
  if (usage.documents > 0) return 'The folder contains documents'
  if (usage.templates.length > 0) return 'Templates are linked to this folder'
  return null
}

export function FolderList() {
  const { mutate: mutateGlobal } = useSWRConfig()
  const { data: folders, mutate } = useSWR('folders', listFolders)
  const { data: usage, mutate: mutateUsage } = useSWR('folder-usage', getFolderUsage)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<Folder | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const handleReorder = async (next: Folder[]) => {
    try {
      await mutate(
        async () => {
          await reorderFolders(next.map((f) => f.id))
          return next.map((f, i) => ({ ...f, sort_order: i + 1 }))
        },
        { optimisticData: next, rollbackOnError: true, revalidate: false },
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not change the order')
    }
  }

  const handleRename = async (folder: Folder, name: string) => {
    try {
      await updateFolder(folder.id, { name })
      await mutate()
      toast.success('Folder renamed')
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not rename the folder')
      return false
    }
  }

  const handleCreate = async (name: string) => {
    try {
      await createFolder(name)
      await Promise.all([mutate(), mutateUsage()])
      toast.success('Folder created')
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create the folder')
      return false
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteFolder(deleting.id)
      await Promise.all([mutate(), mutateUsage(), mutateGlobal('templates-all')])
      toast.success(`Folder «${deleting.name}» deleted`)
      setDeleting(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete the folder')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle>Folders</CardTitle>
          <CardDescription>
            Document folders in the patient record. Drag to change the order.
          </CardDescription>
        </div>
        <Button onClick={() => setAdding(true)} disabled={adding}>
          <PlusIcon aria-hidden="true" />
          New folder
        </Button>
      </CardHeader>

      {!folders && <Skeleton className="m-8 h-10" />}
      {folders?.length === 0 && !adding && (
        <p className="px-8 py-10 text-center text-muted-foreground">No folders yet.</p>
      )}
      {folders && (
        <SortableList items={folders} getId={(f) => f.id} onReorder={handleReorder} className="divide-y divide-border">
          {(folder, handle) => (
            <FolderRow
              folder={folder}
              usage={usage?.[folder.id] ?? noUsage}
              handle={handle}
              onRename={(name) => handleRename(folder, name)}
              onDelete={() => setDeleting(folder)}
            />
          )}
        </SortableList>
      )}
      {adding && (
        <NewFolderRow
          onCreate={async (name) => {
            if (await handleCreate(name)) setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && !deleteBusy && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete folder?</DialogTitle>
            <DialogDescription>The empty folder «{deleting?.name}» will be deleted.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteBusy}>
              {deleteBusy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function FolderRow({
  folder,
  usage,
  handle,
  onRename,
  onDelete,
}: {
  folder: Folder
  usage: FolderUsage
  handle: Omit<React.ComponentProps<typeof DragHandle>, 'label'>
  onRename: (name: string) => Promise<boolean>
  onDelete: () => void
}) {
  const blockReason = deleteBlockReason(usage)
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-card px-8 py-4">
      <DragHandle {...handle} label={`Move folder «${folder.name}»`} />
      <FolderNameInput key={folder.name} folder={folder} onRename={onRename} />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {usage.templates.length === 0 ? (
          <span className="text-sm text-muted-foreground">No templates</span>
        ) : (
          usage.templates.map((t) => (
            <Link
              key={t.id}
              href={`/templates/${t.id}`}
              className="rounded-md bg-status-neutral-bg px-2 py-0.5 text-xs text-status-neutral-fg hover:underline"
            >
              {t.name}
            </Link>
          ))
        )}
      </div>
      <span className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">Documents: {usage.documents}</span>
      {blockReason ? (
        <Tooltip>
          <TooltipTrigger
            render={<span tabIndex={0} className="inline-flex rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" />}
          >
            <Button variant="ghost" size="icon-sm" disabled aria-label={`Delete: ${folder.name}. ${blockReason}`}>
              <Trash2Icon aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{blockReason}</TooltipContent>
        </Tooltip>
      ) : (
        <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label={`Delete: ${folder.name}`}>
          <Trash2Icon aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}

function FolderNameInput({ folder, onRename }: { folder: Folder; onRename: (name: string) => Promise<boolean> }) {
  const [value, setValue] = useState(folder.name)

  const commit = async () => {
    const name = value.trim()
    if (name === folder.name) return
    if (!name) return setValue(folder.name)
    if (!(await onRename(name))) setValue(folder.name)
  }

  return (
    <Input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setValue(folder.name)
          e.currentTarget.blur()
        }
      }}
      aria-label={`Name of folder «${folder.name}»`}
      className="h-8 w-56 max-w-full"
    />
  )
}

function NewFolderRow({ onCreate, onCancel }: { onCreate: (name: string) => Promise<void>; onCancel: () => void }) {
  const id = useId()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    await onCreate(name)
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/40 px-8 py-4">
      <label htmlFor={id} className="sr-only">
        New folder name
      </label>
      <Input
        id={id}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New folder name"
        autoFocus
        className="w-72 max-w-full"
      />
      <Button type="submit" size="sm" disabled={busy || !name.trim()}>
        {busy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
        Create
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
        Cancel
      </Button>
    </form>
  )
}
