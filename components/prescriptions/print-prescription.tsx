'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { toast } from 'sonner'
import { getClinicSettings, getPatient, getPrescription, logPrint } from '@/lib/data'
import { PrescriptionSheet } from './prescription-sheet'

// Prints a prescription without a separate page: the sheet is rendered into <div class="print-root"> in
// document.body (app/print.css then prints only it, even over an open dialog) and removed on afterprint.
export function usePrintPrescription() {
  const [printingId, setPrintingId] = useState<string | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => () => cleanupRef.current?.(), [])

  const print = useCallback(async (prescriptionId: string) => {
    if (cleanupRef.current) return
    setPrintingId(prescriptionId)

    const container = document.createElement('div')
    container.className = 'print-root'
    let root: Root | null = null
    const cleanup = () => {
      window.removeEventListener('afterprint', cleanup)
      root?.unmount()
      container.remove()
      if (cleanupRef.current === cleanup) cleanupRef.current = null
      setPrintingId(null)
    }
    cleanupRef.current = cleanup

    try {
      const detail = await getPrescription(prescriptionId)
      if (!detail) throw new Error('Призначення не знайдено')
      const { summary, items } = detail
      const [patient, clinicSettings] = await Promise.all([getPatient(summary.patient_id), getClinicSettings()])
      if (!patient) throw new Error('Пацієнта не знайдено')
      if (cleanupRef.current !== cleanup) return

      document.body.append(container)
      root = createRoot(container)
      flushSync(() =>
        root!.render(
          <PrescriptionSheet
            clinicSettings={clinicSettings}
            patient={patient}
            doctorName={summary.doctor_name}
            date={summary.created_at}
            rows={items.map((item) => ({
              key: item.id,
              name: item.service?.name ?? item.custom_name ?? '',
              serviceId: item.service_id,
              unitPrice: item.unit_price,
              quantity: item.quantity,
              discountPct: item.discount_pct,
            }))}
            externalRecommendations={summary.external_recommendations ?? ''}
          />,
        ),
      )
      await sheetReady(container)
      if (cleanupRef.current !== cleanup) return

      void logPrint('prescription', prescriptionId, patient.id)
      window.addEventListener('afterprint', cleanup)
      window.print()
    } catch (error) {
      cleanup()
      toast.error(error instanceof Error ? error.message : 'Не вдалося підготувати друк')
    }
  }, [])

  return { print, printing: printingId !== null, printingId }
}

// The print dialog snapshots the page, so the sheet has to be complete: fonts loaded, header and footer decoded,
// and their boxes rounded to whole grid lines (SnapImage does it on load and resize, before the next frame).
async function sheetReady(container: HTMLElement) {
  await document.fonts.ready
  await Promise.all([...container.querySelectorAll('img')].map((img) => img.decode().catch(() => undefined)))
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
}
