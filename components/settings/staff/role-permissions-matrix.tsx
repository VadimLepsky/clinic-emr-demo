import { CheckIcon, MinusIcon } from 'lucide-react'
import type { StaffRole } from '@/lib/types'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { roleLabels } from '@/components/app-shell/labels'

const columns = [
  'Перегляд карток',
  'Створення висновків',
  'Завантаження файлів',
  'Створення та редагування призначень',
  'Видалення призначень',
  'Шаблони',
  'Налаштування',
] as const

const yes = { state: 'yes' } as const
const no = { state: 'no' } as const

// Відображає те, що реально дозволяє застосунок: меню «Додати документ», створення, редагування й видалення призначень
// (canEditPrescriptions у lib/data.ts), розділи бічного меню.
const permissions = [
  {
    role: 'manager',
    cells: [yes, yes, { state: 'yes', note: 'Усі типи' }, yes, yes, yes, yes],
  },
  {
    role: 'doctor',
    cells: [yes, yes, { state: 'yes', note: 'Усі типи' }, yes, no, no, no],
  },
  {
    role: 'medical_staff',
    cells: [yes, no, { state: 'yes', note: 'УЗД, аналізи, інші' }, yes, no, no, no],
  },
  {
    role: 'reception',
    cells: [yes, no, { state: 'partial', note: 'Лише «Інші файли»' }, no, no, no, no],
  },
  {
    role: 'contact_center',
    cells: [yes, no, { state: 'partial', note: 'Лише «Інші файли»' }, no, no, no, no],
  },
] satisfies {
  role: StaffRole
  cells: readonly { state: 'yes' | 'no' | 'partial'; note?: string }[]
}[]

const stateLabels = { yes: 'Так', no: 'Ні', partial: 'Частково' }

export function RolePermissionsMatrix() {
  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle>Права ролей</CardTitle>
          <CardDescription>Лише для перегляду: відображає поточні правила застосунку.</CardDescription>
        </div>
      </CardHeader>
      <Table className="[&_td]:px-2 [&_th]:px-2">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Роль</TableHead>
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
