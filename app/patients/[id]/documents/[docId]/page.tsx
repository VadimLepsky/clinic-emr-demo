import { notFound } from 'next/navigation'
import { getPatient } from '@/lib/data'
import { ConsultationDocument } from '@/components/consultation/consultation-document'

export default async function DocumentPage({ params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params
  const patient = await getPatient(id)
  if (!patient) notFound()

  // Loaded on the client: mock data lives in client memory, so freshly saved documents are found there.
  return <ConsultationDocument key={docId} patient={patient} documentId={docId} />
}
