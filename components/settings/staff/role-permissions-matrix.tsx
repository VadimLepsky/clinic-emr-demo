import { CheckIcon, MinusIcon } from 'lucide-react'
import type { StaffRole } from '@/lib/types'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { roleLabels } from '@/components/app-shell/labels'

const columns = [
  'View records',
  'Create consultation notes',
  'Upload files',
  'Create and edit care plans',
  'Delete care plans',
  'Templates',
  'Settings',
] as const

const yes = { state: 'yes' } as const
const no = { state: 'no' } as const

// Mirrors what the app really allows: the «Add document» menu, creating, editing and deleting care plans
// (canEditPrescriptions in lib/data.ts), the sidebar sections.
const permissions = [
  {
    role: 'manager',
    cells: [yes, yes, { state: 'yes', note: 'All kinds' }, yes, yes, yes, yes],
  },
  {
    role: 'doctor',
    cells: [yes, yes, { state: 'yes', note: 'All kinds' }, yes, no, no, no],
  },
  {
    role: 'medical_staff',
    cells: [yes, no, { state: 'yes', note: 'Ultrasound, lab results, other' }, yes, no, no, no],
  },
  {
    role: 'reception',
    cells: [yes, no, { state: 'partial', note: 'Only «Other files»' }, no, no, no, no],
  },
  {
    role: 'contact_center',
    cells: [yes, no, { state: 'partial', note: 'Only «Other files»' }, no, no, no, no],
  },
] satisfies {
  role: StaffRole
  cells: readonly { state: 'yes' | 'no' | 'partial'; note?: string }[]
}[]

const stateLabels = { yes: 'Yes', no: 'No', partial: 'Partly' }

export function RolePermissionsMatrix() {
  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle>Role permissions</CardTitle>
          <CardDescription>View only: shows the app&apos;s current rules.</CardDescription>
        </div>
      </CardHeader>
      <Table className="[&_td]:px-2 [&_th]:px-2">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Role</TableHead>
            {columns.map((c) => (
              <TableHead key={c} className="text-center whitespace-normal">
                {c}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {permissions.map((row) => (
            <TableRow key={row.role}>
              <TableCell className="font-medium">{roleLabels[row.role]}</TableCell>
              {row.cells.map((cell, i) => {
                const note = 'note' in cell ? cell.note : undefined
                return (
                  <TableCell key={columns[i]} className="text-center whitespace-normal">
                    <span className="flex flex-col items-center gap-0.5">
                      {cell.state === 'no' ? (
                        <MinusIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <CheckIcon
                          className={cell.state === 'yes' ? 'size-4 text-status-success-fg' : 'size-4 text-status-warning-fg'}
                          aria-hidden="true"
                        />
                      )}
                      <span className="sr-only">{stateLabels[cell.state]}</span>
                      {note && <span className="text-sm text-muted-foreground">{note}</span>}
                    </span>
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
