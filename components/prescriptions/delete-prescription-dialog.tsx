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
      toast.success('Orders deleted')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete the orders')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={prescriptionId !== null} onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete these orders?</DialogTitle>
          <DialogDescription>The orders will be hidden; their financial history is kept.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={pending}>
            {pending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
