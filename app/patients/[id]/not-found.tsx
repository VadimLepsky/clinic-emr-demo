import { Page, PageHeader } from '@/components/app-shell/page'

export default function PatientNotFound() {
  return (
    <Page>
      <PageHeader
        back={{ href: '/patients', label: 'До списку пацієнтів' }}
        title="Пацієнта не знайдено"
        description="Перевірте посилання або скористайтеся пошуком."
      />
    </Page>
  )
}
