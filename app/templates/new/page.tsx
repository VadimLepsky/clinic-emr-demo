import { ManagerOnly } from '@/components/template-builder/manager-only'
import { NewTemplatePage } from '@/components/template-builder/template-editor-page'

export const metadata = { title: 'Новий шаблон' }

export default function Page() {
  return (
    <ManagerOnly>
      <NewTemplatePage />
    </ManagerOnly>
  )
}
