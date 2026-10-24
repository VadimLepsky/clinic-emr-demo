import { getCurrentUser } from '@/lib/data'
import { Page } from '@/components/app-shell/page'
import { DoctorHome } from '@/components/home/doctor-home'
import { HomeGreeting } from '@/components/home/home-greeting'
import { ManagerHome } from '@/components/home/manager-home'
import { ReceptionHome } from '@/components/home/reception-home'

export const metadata = { title: 'Головна' }

export default async function HomePage() {
  const user = await getCurrentUser()

  return (
    <Page>
      <HomeGreeting user={user} />
      {user.role === 'manager' ? (
        <ManagerHome />
      ) : user.role === 'reception' || user.role === 'contact_center' ? (
        <ReceptionHome />
      ) : (
        <DoctorHome userId={user.id} />
      )}
    </Page>
  )
}
