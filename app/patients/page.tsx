import { Page, PageHeader } from '@/components/app-shell/page'
import { PatientSearch } from '@/components/patients/patient-search'

export const metadata = { title: 'Patients' }

export default function PatientsPage() {
  return (
    <Page width="wide">
      <PageHeader title="Patients" description="Search by name or CRM ID" />
      <PatientSearch />
    </Page>
  )
}
