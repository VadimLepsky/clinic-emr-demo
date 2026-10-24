'use client'

import { useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { FileXIcon } from 'lucide-react'
import {
  getCurrentUser,
  getFolderCounts,
  listDocumentFiles,
  listDocuments,
  listFolders,
  listStaff,
} from '@/lib/data'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AddDocumentMenu } from './add-document-menu'
import { DocumentTable } from './document-table'
import { FolderList } from './folder-list'
import { UploadDialog } from './upload-dialog'

export function DocumentsTab({ patientId }: { patientId: string }) {
  const { mutate } = useSWRConfig()
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null)

  const { data: folders } = useSWR('folders', listFolders)
  const { data: staff } = useSWR('staff', listStaff)
  const { data: currentUser } = useSWR('current-user', getCurrentUser)
  const { data: counts } = useSWR(['folder-counts', patientId], ([, id]) => getFolderCounts(id))
  const { data: documents } = useSWR(['documents', patientId, activeFolderId], ([, id, folderId]) =>
    listDocuments(id, folderId ?? undefined),
  )

  const uploadIds = documents?.filter((d) => d.kind === 'upload').map((d) => d.id) ?? []
  const { data: filesByDocument } = useSWR(
    uploadIds.length ? ['document-files', ...uploadIds] : null,
    async ([, ...ids]) => {
      const lists = await Promise.all(ids.map((id) => listDocumentFiles(id)))
      return Object.fromEntries(ids.map((id, i) => [id, lists[i]]))
    },
  )

  const totalCount = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : 0
  const folderName = (id: string) => folders?.find((f) => f.id === id)?.name

  const startUpload = (name: string) => {
    const folder = folders?.find((f) => f.name === name) ?? folders?.[folders.length - 1]
    if (folder) setUploadFolderId(folder.id)
  }

  const handleUploaded = async (folderId: string) => {
    setUploadFolderId(null)
    setActiveFolderId(folderId)
    await mutate(
      (key) => Array.isArray(key) && (key[0] === 'folder-counts' || key[0] === 'documents') && key[1] === patientId,
    )
  }

  return (
    <div className="@container">
      <div className="flex flex-col gap-6 @5xl:flex-row">
        <Card className="p-3 @5xl:w-64 @5xl:shrink-0 @5xl:self-start">
          {folders && counts ? (
            <FolderList
              folders={folders}
              counts={counts}
              activeFolderId={activeFolderId}
              onSelect={setActiveFolderId}
            />
          ) : (
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}
        </Card>

        <Card plain className="flex-1">
          <CardHeader className="border-b-0">
            <CardTitle>{activeFolderId ? folderName(activeFolderId) : 'Усі документи'}</CardTitle>
            <AddDocumentMenu patientId={patientId} role={currentUser?.role} onUpload={startUpload} />
          </CardHeader>

          {!documents || !folders || !staff ? (
            <Skeleton className="m-8 h-64" />
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-8 py-14 text-center">
              <FileXIcon className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-muted-foreground">
                {totalCount === 0 ? 'У пацієнта ще немає документів' : 'У цій папці немає документів'}
              </p>
            </div>
          ) : (
            <DocumentTable
              patientId={patientId}
              documents={documents}
              folders={folders}
              staff={staff}
              files={filesByDocument ?? {}}
            />
          )}
        </Card>

        {folders && (
          <UploadDialog
            open={uploadFolderId !== null}
            onOpenChange={(open) => !open && setUploadFolderId(null)}
            patientId={patientId}
            folders={folders}
            initialFolderId={uploadFolderId ?? folders[0]?.id ?? ''}
            onUploaded={handleUploaded}
          />
        )}
      </div>
    </div>
  )
}
