import { AllPrescriptions } from '@/components/prescriptions/all-prescriptions'
import { isPeriod } from '@/components/prescriptions/period'

export const metadata = { title: 'Orders' }

export default async function PrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ doctor?: string; period?: string }>
}) {
  const { doctor, period } = await searchParams

  return <AllPrescriptions initialPeriod={isPeriod(period) ? period : 'all'} initialDoctorId={doctor ?? ''} />
}
