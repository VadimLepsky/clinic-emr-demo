'use client'

import { useState } from 'react'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { deletePrescription } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type DeletePrescriptionDialogProps = {
  prescriptionId: string | null
  onClose: () => void
}

export function DeletePrescriptionDialog({ prescriptionId, onClose }: DeletePrescriptionDialogProps) {
  const { mutate } = useSWRConfig()
  const [pending, setPending] = useState(false)

  const handleDelete = async () => {
    if (!prescriptionId) return
    setPending(true)
    try {
      await deletePrescription(prescriptionId)
      await mutate((key) => Array.isArray(key) && (key[0] === 'prescriptions' || key[0] === 'prescription'))
      toast.success('Призначення видалено')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не вдалося видалити призначення')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={prescriptionId !== null} onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Видалити призначення?</DialogTitle>
          <DialogDescription>Призначення буде приховане, фінансова історія зберігається.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Скасувати
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={pending}>
            {pending ? 'Видалення…' : 'Видалити'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
