import { Page, PageHeader } from '@/components/app-shell/page'

export default function PatientNotFound() {
  return (
    <Page>
      <PageHeader
        back={{ href: '/patients', label: 'Back to patients' }}
        title="Patient not found"
        description="Check the link or use the search."
      />
    </Page>
  )
}
