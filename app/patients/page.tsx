import { Page, PageHeader } from '@/components/app-shell/page'
import { PatientSearch } from '@/components/patients/patient-search'

export const metadata = { title: 'Пацієнти' }

export default function PatientsPage() {
  return (
    <Page width="wide">
      <PageHeader title="Пацієнти" description="Пошук за ПІБ або CRM ID" />
      <PatientSearch />
    </Page>
  )
}
