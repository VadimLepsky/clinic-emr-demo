import { calcAge } from '@/lib/data'
import type { Patient } from '@/lib/types'
import { formatAge, formatDate, sexLabels } from '@/components/app-shell/labels'
import { PageHeader } from '@/components/app-shell/page'
import { Card } from '@/components/ui/card'

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

export function PatientHeader({ patient }: { patient: Patient }) {
  return (
    <section aria-labelledby="patient-name" className="flex flex-col gap-6">
      <PageHeader
        titleId="patient-name"
        title={patient.full_name}
        back={{ href: '/patients', label: 'Back to patients' }}
      />
      <Card plain>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-5 px-8 py-6 sm:grid-cols-4">
          <Field label="CRM ID" value={String(patient.crm_client_id)} />
          <Field label="Date of birth" value={formatDate(patient.birth_date)} />
          <Field label="Age" value={formatAge(calcAge(patient.birth_date))} />
          <Field label="Sex" value={patient.sex ? sexLabels[patient.sex] : '—'} />
        </dl>
      </Card>
    </section>
  )
}
