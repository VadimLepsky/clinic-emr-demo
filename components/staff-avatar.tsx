import Image from 'next/image'
import type { Staff, StaffRole } from '@/lib/types'
import { cn } from '@/lib/utils'

export type StaffAvatarSize = 24 | 32 | 36 | 40 | 96

const roleIcons: Record<StaffRole, string> = {
  doctor: 'doctor',
  medical_staff: 'medical-staff',
  manager: 'manager',
  reception: 'staff',
  contact_center: 'staff',
}

type StaffAvatarProps = {
  staff: Pick<Staff, 'full_name' | 'role' | 'photo_url'>
  size: StaffAvatarSize
  className?: string
}

export function StaffAvatar({ staff, size, className }: StaffAvatarProps) {
  const frame = cn('inline-block shrink-0 overflow-hidden rounded-full bg-muted', className)
  const style = { width: size, height: size }

  if (staff.photo_url) {
    return (
      <span className={frame} style={style}>
        <Image
          src={staff.photo_url}
          alt={staff.full_name}
          width={size}
          height={size}
          unoptimized
          className="size-full object-cover"
        />
      </span>
    )
  }

  const icon = roleIcons[staff.role]
  return (
    <span className={frame} style={style}>
      <Image
        src={`/avatars/${icon}.png`}
        alt={staff.full_name}
        width={size}
        height={size}
        className="size-full object-cover dark:hidden"
      />
      <Image
        src={`/avatars/${icon}-dark.png`}
        alt={staff.full_name}
        width={size}
        height={size}
        aria-hidden="true"
        className="hidden size-full object-cover dark:block"
      />
    </span>
  )
}
