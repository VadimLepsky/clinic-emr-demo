import { ManagerOnly } from '@/components/template-builder/manager-only'
import { EditTemplatePage } from '@/components/template-builder/template-editor-page'

export const metadata = { title: 'Edit template' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <ManagerOnly>
      <EditTemplatePage templateId={id} />
    </ManagerOnly>
  )
}
