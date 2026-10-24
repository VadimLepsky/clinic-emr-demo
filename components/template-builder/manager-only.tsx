import { getCurrentUser } from '@/lib/data'
import { Page, PageHeader } from '@/components/app-shell/page'

export async function ManagerOnly({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (user.role === 'manager') return children
  return (
    <Page>
      <PageHeader title="This section is for the clinic manager only" />
    </Page>
  )
}
