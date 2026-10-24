'use client'

import { useId, useRef } from 'react'
import { toast } from 'sonner'
import { ImagePlusIcon, Trash2Icon } from 'lucide-react'
import type { Staff } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { StaffAvatar } from '@/components/staff-avatar'

const MAX_BYTES = 2 * 1024 * 1024
const OUTPUT_SIZE = 512
const ACCEPTED_TYPES = ['image/jpeg', 'image/png']

function cropToSquareDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight)
      const output = Math.min(side, OUTPUT_SIZE)
      const canvas = document.createElement('canvas')
      canvas.width = output
      canvas.height = output
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(objectUrl)
        return reject(new Error('Canvas недоступний'))
      }
      const sx = (img.naturalWidth - side) / 2
      const sy = (img.naturalHeight - side) / 2
      ctx.drawImage(img, sx, sy, side, side, 0, 0, output, output)
      URL.revokeObjectURL(objectUrl)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Не вдалося прочитати зображення'))
    }
    img.src = objectUrl
  })
}

type StaffPhotoControlProps = {
  staff: Pick<Staff, 'full_name' | 'role' | 'photo_url'>
  onChange: (photoUrl: string | null) => void | Promise<void>
  disabled?: boolean
}

export function StaffPhotoControl({ staff, onChange, disabled }: StaffPhotoControlProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) return void toast.error('Підтримуються лише JPEG та PNG')
    if (file.size > MAX_BYTES) return void toast.error('Файл завеликий: максимум 2 МБ')
    try {
      await onChange(await cropToSquareDataUrl(file))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не вдалося завантажити фото')
    }
  }

  return (
    <div className="flex items-center gap-4">
      <StaffAvatar staff={staff} size={96} />
      <div className="flex flex-col items-start gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png"
          className="sr-only"
          tabIndex={-1}
          onChange={handleFile}
        />
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
          <ImagePlusIcon aria-hidden="true" />
          Завантажити фото
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || !staff.photo_url}
          onClick={() => onChange(null)}
        >
          <Trash2Icon aria-hidden="true" />
          Видалити фото
        </Button>
        <p className="text-sm text-muted-foreground">JPEG або PNG, до 2 МБ</p>
      </div>
    </div>
  )
}
