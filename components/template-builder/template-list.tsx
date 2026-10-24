'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR, { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { CopyIcon, PencilIcon, PlusIcon } from 'lucide-react'
import { duplicateTemplate, listAllTemplates, listFolders, setTemplateActive } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Page, PageHeader } from '@/components/app-shell/page'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { kindLabels } from './builder-utils'

export function TemplateList() {
  const router = useRouter()
  const { mutate: mutateGlobal } = useSWRConfig()
  const { data: templates, mutate } = useSWR('templates-all', listAllTemplates)
  const { data: folders } = useSWR('folders', listFolders)
  const folderName = (id: string) => folders?.find((f) => f.id === id)?.name ?? '—'

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await mutate(
        async (current) => {
          await setTemplateActive(id, active)
          return current?.map((t) => (t.id === id ? { ...t, is_active: active } : t))
        },
        {
          optimisticData: (current) => (current ?? []).map((t) => (t.id === id ? { ...t, is_active: active } : t)),
          rollbackOnError: true,
          revalidate: false,
        },
      )
      await mutateGlobal('templates')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не вдалося змінити статус')
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      const copy = await duplicateTemplate(id)
      await Promise.all([mutate(), mutateGlobal('templates')])
      toast.success('Шаблон продубльовано')
      router.push(`/templates/${copy.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не вдалося дублювати шаблон')
    }
  }

  return (
    <Page>
      <PageHeader
        title="Шаблони"
        description="Неактивні шаблони приховані від лікарів."
        actions={
          <Button nativeButton={false} render={<Link href="/templates/new" />}>
            <PlusIcon aria-hidden="true" />
            Новий шаблон
          </Button>
        }
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Назва</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Спеціальність</TableHead>
              <TableHead>Папка</TableHead>
              <TableHead className="text-right">Версія</TableHead>
              <TableHead>Активний</TableHead>
              <TableHead className="text-right">Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!templates &&
              Array.from({ length: 3 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {templates?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Шаблонів ще немає.
                </TableCell>
              </TableRow>
            )}
            {templates?.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium whitespace-normal">
                  <Link href={`/templates/${t.id}`} className="hover:underline">
                    {t.name}
                  </Link>
                </TableCell>
                <TableCell>{kindLabels[t.kind]}</TableCell>
                <TableCell>{t.specialty ?? '—'}</TableCell>
                <TableCell className="whitespace-normal">{folderName(t.folder_id)}</TableCell>
                <TableCell className="text-right tabular-nums">{t.version}</TableCell>
                <TableCell>
                  <Switch
                    checked={t.is_active}
                    onCheckedChange={(v) => toggleActive(t.id, v)}
                    aria-label={`Активний: ${t.name}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-end">
                    <Button nativeButton={false} variant="ghost" size="sm" render={<Link href={`/templates/${t.id}`} />}>
                      <PencilIcon aria-hidden="true" />
                      Редагувати
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDuplicate(t.id)}>
                      <CopyIcon aria-hidden="true" />
                      Дублювати
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Page>
  )
}
