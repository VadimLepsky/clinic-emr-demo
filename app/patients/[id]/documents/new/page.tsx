import { notFound } from 'next/navigation'
import { getPatient } from '@/lib/data'
import { NewDocument } from '@/components/documents/new-document'

// /patients/[id]/documents/new?template=<templateId>: the document's type comes from the template.
export default async function NewDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ template?: string }>
}) {
  const [{ id }, { template }] = await Promise.all([params, searchParams])
  const patient = await getPatient(id)
  if (!patient) notFound()

  return <NewDocument patient={patient} templateId={template ?? null} />
}
