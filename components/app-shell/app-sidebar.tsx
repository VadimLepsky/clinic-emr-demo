'use client'

import type { MouseEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ClipboardListIcon,
  FileTextIcon,
  HomeIcon,
  SettingsIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'
import type { Staff, StaffRole } from '@/lib/types'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { SidebarProfile } from './sidebar-profile'

type NavItem = {
  title: string
  href: string
  icon: LucideIcon
}

type NavGroup = {
  label: string
  items: NavItem[]
  roles?: StaffRole[]
}

const homeItem: NavItem = { title: 'Головна', href: '/', icon: HomeIcon }

const navGroups: NavGroup[] = [
  {
    label: 'Робота',
    items: [
      { title: 'Пацієнти', href: '/patients', icon: UsersIcon },
      { title: 'Призначення', href: '/prescriptions', icon: ClipboardListIcon },
    ],
  },
  {
    label: 'Керування',
    roles: ['manager'],
    items: [
      { title: 'Шаблони', href: '/templates', icon: FileTextIcon },
      { title: 'Налаштування', href: '/settings', icon: SettingsIcon },
    ],
  },
]

export function AppSidebar({ user }: { user: Staff }) {
  const pathname = usePathname()
  const groups = navGroups.filter((group) => !group.roles || group.roles.includes(user.role))

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-5 pt-10 pb-10 group-data-[collapsible=icon]:px-3.5">
        <div className="flex items-center gap-1">
          <Image src="/logo-placeholder.png" alt="" width={36} height={36} className="size-9 shrink-0 rounded-lg" />
          {/* text-box trims the line to x-height (the label is lowercase), so items-center lines the letters up with the logo. */}
          <span className="font-document text-2xl leading-none font-semibold tracking-tight whitespace-nowrap text-sidebar-foreground [text-box:trim-both_ex_alphabetic] group-data-[collapsible=icon]:hidden">
            мед.кабінет
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-4 px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <NavMenu items={[homeItem]} isActive={isActive} />
          </SidebarGroupContent>
        </SidebarGroup>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="mb-1 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <NavMenu items={group.items} isActive={isActive} />
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="bg-sidebar-accent/35 px-4 py-3 group-data-[collapsible=icon]:px-2.5">
        <SidebarProfile user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}

// The sidebar persists across navigation, so a clicked link keeps focus and Chrome turns it into
// :focus-visible on the next key press (Escape, arrows, space). Drop focus after a pointer click;
// keyboard activation (Enter fires a click with detail 0) keeps the ring.
const blurAfterPointerClick = (event: MouseEvent<HTMLElement>) => {
  if (event.detail > 0) event.currentTarget.blur()
}

function NavMenu({ items, isActive }: { items: NavItem[]; isActive: (href: string) => boolean }) {
  return (
    <SidebarMenu className="gap-1">
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            isActive={isActive(item.href)}
            tooltip={item.title}
            render={<Link href={item.href} />}
            onClick={blurAfterPointerClick}
          >
            <item.icon />
            <span>{item.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
