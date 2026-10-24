import { ManagerOnly } from '@/components/template-builder/manager-only'
import { TemplateList } from '@/components/template-builder/template-list'

export const metadata = { title: 'Templates' }

export default function TemplatesPage() {
  return (
    <ManagerOnly>
      <TemplateList />
    </ManagerOnly>
  )
}
