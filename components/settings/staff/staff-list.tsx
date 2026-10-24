'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { listStaff } from '@/lib/data'
import type { Staff } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { roleLabels } from '@/components/app-shell/labels'
import { RolePermissionsMatrix } from './role-permissions-matrix'
import { StaffDialog } from './staff-dialog'

const needsCrmId = (s: Staff) => (s.role === 'doctor' || s.role === 'medical_staff') && s.crm_master_id === null

export function StaffList() {
  const { data: staff, mutate } = useSWR('staff', listStaff)
  const [editing, setEditing] = useState<Staff | 'new' | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>Співробітники</CardTitle>
            <CardDescription>
              Співробітників не видаляють, лише деактивують: історія зберігає автора.
            </CardDescription>
          </div>
          <Button onClick={() => setEditing('new')}>
            <PlusIcon aria-hidden="true" />
            Новий співробітник
          </Button>
        </CardHeader>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>ПІБ</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Спеціальність</TableHead>
              <TableHead>ID в CRM</TableHead>
              <TableHead>Активний</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Дії</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!staff && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            )}
            {staff?.map((s) => (
              <TableRow key={s.id} className={s.is_active ? undefined : 'text-muted-foreground'}>
                <TableCell className="font-medium">{s.full_name}</TableCell>
                <TableCell>{roleLabels[s.role]}</TableCell>
                <TableCell>{s.specialty ?? '—'}</TableCell>
                <TableCell>
                  {s.crm_master_id !== null ? (
                    <span className="tabular-nums">{s.crm_master_id}</span>
                  ) : needsCrmId(s) ? (
                    <span className="inline-flex items-center rounded-md bg-status-warning-bg px-2 py-0.5 text-xs font-medium whitespace-nowrap text-status-warning-fg">
                      Немає ID в CRM
                    </span>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>{s.is_active ? 'Так' : 'Ні'}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditing(s)} aria-label={`Редагувати: ${s.full_name}`}>
                    <PencilIcon aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <RolePermissionsMatrix />

      <StaffDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        staff={editing === 'new' ? null : editing}
        onSaved={async () => {
          await mutate()
          setEditing(null)
        }}
      />
    </div>
  )
}
