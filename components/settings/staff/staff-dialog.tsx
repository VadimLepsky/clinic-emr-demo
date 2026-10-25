'use client'

import { useId, useState } from 'react'
import { toast } from 'sonner'
import { Loader2Icon } from 'lucide-react'
import { createStaff, updateStaff } from '@/lib/data'
import type { Staff, StaffRole } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { roleLabels } from '@/components/app-shell/labels'

export const roleOrder: StaffRole[] = ['manager', 'doctor', 'medical_staff', 'reception', 'contact_center']

const roleItems = roleOrder.map((value) => ({ value, label: roleLabels[value] }))

type StaffDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff: Staff | null
  onSaved: () => Promise<void>
}

export function StaffDialog({ open, onOpenChange, staff, onSaved }: StaffDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && <StaffForm key={staff?.id ?? 'new'} staff={staff} onSaved={onSaved} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function StaffForm({
  staff,
  onSaved,
  onCancel,
}: Pick<StaffDialogProps, 'staff' | 'onSaved'> & { onCancel: () => void }) {
  const id = useId()
  const [fullName, setFullName] = useState(staff?.full_name ?? '')
  const [role, setRole] = useState<StaffRole>(staff?.role ?? 'doctor')
  const [specialty, setSpecialty] = useState(staff?.specialty ?? '')
  const [crmId, setCrmId] = useState(staff?.crm_master_id?.toString() ?? '')
  const [isActive, setIsActive] = useState(staff?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) return setError('Enter the full name.')
    const crmTrimmed = crmId.trim()
    const crm = crmTrimmed ? Number(crmTrimmed) : null
    if (crm !== null && (!Number.isInteger(crm) || crm <= 0)) return setError('The CRM ID must be a positive whole number.')
    setSaving(true)
    setError(null)
    const input = { full_name: fullName, role, specialty: specialty || null, crm_master_id: crm, is_active: isActive }
    try {
      if (staff) await updateStaff(staff.id, input)
      else await createStaff(input)
      toast.success(staff ? 'Staff member updated' : 'Staff member added')
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the staff member.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{staff ? 'Edit staff member' : 'New staff member'}</DialogTitle>
        <DialogDescription>Staff are never deleted, only deactivated: the history keeps its authors.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-name`}>Full name</Label>
          <Input id={`${id}-name`} value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-role`}>Role</Label>
            <Select items={roleItems} value={role} onValueChange={(v) => v && setRole(v as StaffRole)}>
              <SelectTrigger id={`${id}-role`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-specialty`}>Specialty</Label>
            <Input id={`${id}-specialty`} value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-crm`}>Doctor ID in the CRM</Label>
          <Input
            id={`${id}-crm`}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={crmId}
            onChange={(e) => setCrmId(e.target.value)}
            aria-describedby={`${id}-crm-hint`}
          />
          <p id={`${id}-crm-hint`} className="text-sm text-muted-foreground">
            Needed for «Today&apos;s patients» and the analytics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Switch id={`${id}-active`} checked={isActive} onCheckedChange={setIsActive} />
          <Label htmlFor={`${id}-active`}>Active</Label>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2Icon className="animate-spin" aria-hidden="true" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  )
}
