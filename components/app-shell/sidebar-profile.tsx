'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR, { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { CheckIcon, ImageIcon, UsersIcon } from 'lucide-react'
import { DEMO_MODE, getCurrentUser, listStaff, loginAsDemoUser, updateStaffPhoto } from '@/lib/data'
import type { Staff } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { StaffAvatar } from '@/components/staff-avatar'
import { StaffPhotoControl } from '@/components/staff-photo-control'
import { roleLabels } from './labels'

export function SidebarProfile({ user: initialUser }: { user: Staff }) {
  const { data: user = initialUser } = useSWR('current-user', getCurrentUser, { fallbackData: initialUser })
  const { mutate } = useSWRConfig()
  const [open, setOpen] = useState(false)

  const changePhoto = async (photoUrl: string | null) => {
    try {
      const updated = await updateStaffPhoto(user.id, photoUrl)
      await mutate('current-user', updated, { revalidate: false })
      await mutate('staff')
      toast.success(photoUrl ? 'Фото оновлено' : 'Фото видалено')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не вдалося зберегти фото')
    }
  }

  const subtitle = [roleLabels[user.role], user.specialty].filter(Boolean).join(' · ')
  const profileButton = (
    <>
      <StaffAvatar staff={user} size={36} />
      <span className="flex min-w-0 flex-col gap-0.5 text-left leading-tight">
        <span className="truncate font-semibold">{user.full_name}</span>
        <span className="truncate text-sm text-muted-foreground">{subtitle}</span>
      </span>
    </>
  )

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          {DEMO_MODE ? (
            <DemoProfileMenu user={user} onOpenPhoto={() => setOpen(true)}>
              {profileButton}
            </DemoProfileMenu>
          ) : (
            <SidebarMenuButton
              size="lg"
              tooltip={user.full_name}
              onClick={() => setOpen(true)}
              aria-label={`Профіль: ${user.full_name}`}
            >
              {profileButton}
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{user.full_name}</DialogTitle>
            <DialogDescription>{subtitle}</DialogDescription>
          </DialogHeader>
          <StaffPhotoControl staff={user} onChange={changePhoto} />
          <DialogFooter>
            <Button type="button" onClick={() => setOpen(false)}>
              Готово
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Demo only (NEXT_PUBLIC_DEMO=1): the profile button opens a menu with «Увійти як…» to show the app from
// another role. The choice is a cookie, so server components and client data switch together.
function DemoProfileMenu({
  user,
  onOpenPhoto,
  children,
}: {
  user: Staff
  onOpenPhoto: () => void
  children: React.ReactNode
}) {
  const router = useRouter()
  const { mutate } = useSWRConfig()
  const { data: staff } = useSWR('staff', listStaff)
  const members = (staff ?? []).filter((s) => s.is_active)

  const switchTo = async (member: Staff) => {
    if (member.id === user.id) return
    try {
      await loginAsDemoUser(member.id)
      await mutate(() => true)
      router.refresh()
      toast.success(`Ви увійшли як ${member.full_name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не вдалося змінити користувача')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<SidebarMenuButton size="lg" tooltip={user.full_name} aria-label={`Профіль: ${user.full_name}`} />}
      >
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-64">
        <DropdownMenuItem onClick={onOpenPhoto}>
          <ImageIcon aria-hidden="true" />
          Фото профілю…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <UsersIcon aria-hidden="true" />
            Увійти як…
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-80">
            {members.map((member) => (
              <DropdownMenuItem key={member.id} onClick={() => switchTo(member)} className="gap-3 py-2">
                <StaffAvatar staff={member} size={32} />
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate font-medium">{member.full_name}</span>
                  <span className="truncate text-sm text-muted-foreground">{roleLabels[member.role]}</span>
                </span>
                {member.id === user.id && <CheckIcon className="ml-auto text-muted-foreground" aria-label="Поточний" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
