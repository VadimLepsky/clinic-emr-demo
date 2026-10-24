'use client'

import useSWR from 'swr'
import { getTemplate, listLetterheads } from '@/lib/data'
import { Page, PageHeader, pageWidthClass } from '@/components/app-shell/page'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { TemplateEditor } from './template-editor'

const emptyMeta = {
  name: '',
  kind: 'consultation' as const,
  specialty: null,
  folder_id: '',
  header_id: null,
  footer_id: null,
  footer_text: null,
  show_signature: true,
  banner_image_url: null,
  footer_image_url: null,
  package_ids: [],
}

// A new template starts with the default header and no footer.
export function NewTemplatePage() {
  const { data: letterheads } = useSWR('letterheads', listLetterheads)
  if (!letterheads) return <Skeleton className={cn('h-96 rounded-2xl', pageWidthClass.default)} />
  const header_id = letterheads.find((l) => l.kind === 'header' && l.is_default)?.id ?? null
  return <TemplateEditor version={null} initialMeta={{ ...emptyMeta, header_id }} initialSchema={{ sections: [] }} />
}

export function EditTemplatePage({ templateId }: { templateId: string }) {
  const { data, isLoading } = useSWR(['template', templateId], ([, id]) => getTemplate(id), {
    revalidateOnFocus: false,
  })

  if (isLoading && !data) return <Skeleton className={cn('h-96 rounded-2xl', pageWidthClass.default)} />
  if (!data) {
    return (
      <Page>
        <PageHeader back={{ href: '/templates', label: 'Шаблони' }} title="Шаблон не знайдено" />
      </Page>
    )
  }

  const { template, version } = data
  return (
    <TemplateEditor
      key={template.id}
      templateId={template.id}
      version={version.version}
      initialMeta={{
        name: template.name,
        kind: template.kind,
        specialty: template.specialty,
        folder_id: template.folder_id,
        header_id: template.header_id,
        footer_id: template.footer_id,
        footer_text: template.footer_text,
        show_signature: template.show_signature,
        banner_image_url: template.banner_image_url,
        footer_image_url: template.footer_image_url,
        package_ids: [...template.package_ids],
      }}
      initialSchema={structuredClone(version.schema)}
    />
  )
}
