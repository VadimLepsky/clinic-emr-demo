import { PageHeader } from '@/components/app-shell/page'
import { ManagerOnly } from '@/components/template-builder/manager-only'
import { SettingsNav } from '@/components/settings/settings-nav'
import { SettingsPage } from '@/components/settings/settings-page'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ManagerOnly>
      <SettingsPage>
        <PageHeader title="Settings" />
        <div className="@container">
          <div className="flex flex-col gap-6 @5xl:flex-row">
            <SettingsNav />
            <div className="flex min-w-0 flex-1 flex-col gap-6">{children}</div>
          </div>
        </div>
      </SettingsPage>
    </ManagerOnly>
  )
}
