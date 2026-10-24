'use client'

import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import type { Patient } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PatientSearch } from '@/components/patients/patient-search'
import { TemplatePicker } from '@/components/documents/template-picker-dialog'

/** Step 1: find the patient. Step 2, in the same dialog: pick the template («Назад» returns to the search). */
export function NewVisitDialog() {
  const [open, setOpen] = useState(false)
  const [patient, setPatient] = useState<Patient | null>(null)

  // Every opening starts from the search; closing keeps the step, so the content doesn't change while it fades out.
  const start = () => {
    setPatient(null)
    setOpen(true)
  }

  return (
    <>
      <Button onClick={start}>
        <PlusIcon className="size-4" aria-hidden="true" />
        Новий прийом
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          {patient ? (
            <>
              <DialogHeader>
                <DialogTitle>Оберіть шаблон</DialogTitle>
                <DialogDescription>Пацієнт: {patient.full_name}</DialogDescription>
              </DialogHeader>
              <TemplatePicker patientId={patient.id} onPicked={() => setOpen(false)} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setPatient(null)}>
                  Назад
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Новий прийом</DialogTitle>
                <DialogDescription>Знайдіть пацієнта, потім оберіть шаблон документа.</DialogDescription>
              </DialogHeader>
              <PatientSearch onSelect={setPatient} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
