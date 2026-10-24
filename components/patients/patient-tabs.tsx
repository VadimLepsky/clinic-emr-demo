import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DocumentsTab } from '@/components/documents/documents-tab'
import { HistoryTab } from '@/components/history/history-tab'
import { PrescriptionsTab } from '@/components/prescriptions/prescriptions-tab'

const tabs = [
  { value: 'documents', label: 'Документи' },
  { value: 'prescriptions', label: 'Призначення' },
  { value: 'history', label: 'Історія змін' },
]

export function PatientTabs({ patientId, initialTab }: { patientId: string; initialTab?: string }) {
  const defaultTab = tabs.some((tab) => tab.value === initialTab) ? initialTab : 'documents'

  return (
    <Tabs defaultValue={defaultTab} className="flex-col gap-6">
      <TabsList variant="line" className="h-12 w-full justify-start gap-2 border-b border-tabs-line">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="flex-none px-3">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="documents">
        <DocumentsTab patientId={patientId} />
      </TabsContent>
      <TabsContent value="prescriptions">
        <PrescriptionsTab patientId={patientId} />
      </TabsContent>
      <TabsContent value="history">
        <HistoryTab patientId={patientId} />
      </TabsContent>
    </Tabs>
  )
}
