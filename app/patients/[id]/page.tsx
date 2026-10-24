import { notFound } from 'next/navigation'
import { getPatient } from '@/lib/data'
import { Page } from '@/components/app-shell/page'
import { PatientHeader } from '@/components/patients/patient-header'
import { PatientTabs } from '@/components/patients/patient-tabs'

export default async function PatientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string | string[] }>
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams])
  const patient = await getPatient(id)
  if (!patient) notFound()

  return (
    <Page>
      <PatientHeader patient={patient} />
      <PatientTabs patientId={patient.id} initialTab={Array.isArray(tab) ? tab[0] : tab} />
    </Page>
  )
}
