'use client'

import { useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ImageIcon, Trash2Icon, UploadIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']
const MAX_BYTES = 5 * 1024 * 1024

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Не вдалося прочитати файл'))
    reader.readAsDataURL(file)
  })
}

type ImageUploadFieldProps = {
  label: string
  /** Data URL in mocks (later a Supabase Storage URL). */
  value: string | null
  onChange: (value: string | null) => void
  hint?: string
  /** Shows a note when the uploaded image is narrower than this (print sharpness). */
  minWidth?: number
  /** Preview box shape: wide strips (header, banner) or a small logo. */
  previewClassName?: string
}

// Upload control for document images (clinic header, template banner and footer logo, image blocks):
// PNG / JPG / SVG up to 5 MB, stored as a data URL, with a preview and «Видалити».
export function ImageUploadField({
  label,
  value,
  onChange,
  hint,
  minWidth,
  previewClassName,
}: ImageUploadFieldProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [naturalWidth, setNaturalWidth] = useState<number | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) return void toast.error('Підтримуються PNG, JPG та SVG')
    if (file.size > MAX_BYTES) return void toast.error('Файл завеликий: максимум 5 МБ')
    try {
      onChange(await readAsDataUrl(file))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не вдалося завантажити зображення')
    }
  }

  const tooNarrow = Boolean(value && minWidth && naturalWidth && naturalWidth < minWidth && !value.startsWith('data:image/svg'))

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40 p-2',
          previewClassName ?? 'h-28 w-full',
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={`Поточне зображення: ${label}`}
            onLoad={(e) => setNaturalWidth(e.currentTarget.naturalWidth)}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <ImageIcon className="size-6 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            void handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <UploadIcon aria-hidden="true" />
          {value ? 'Замінити' : 'Завантажити'}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(null)
              setNaturalWidth(null)
            }}
          >
            <Trash2Icon aria-hidden="true" />
            Видалити
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {hint ?? 'PNG, JPG або SVG, до 5 МБ.'}
        {tooNarrow && (
          <span className="block text-status-warning-fg">
            {`Ширина ${naturalWidth} px — для чіткого друку краще від ${minWidth} px.`}
          </span>
        )}
      </p>
    </div>
  )
}
