import { ServiceList } from '@/components/settings/services/service-list'

export const metadata = { title: 'Послуги' }

export default async function ServicesSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ import?: string }>
}) {
  const { import: importParam } = await searchParams

  return <ServiceList initialImportOpen={importParam === '1'} />
}
