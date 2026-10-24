'use client'

import { useRef } from 'react'
import { BracesIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { templateVariables } from './builder-utils'

type VariableInputProps = {
  id: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  rows?: number
  placeholder?: string
}

/** Text input with a "Вставити змінну" menu that inserts at the cursor position. */
export function VariableInput({ id, value, onChange, multiline, rows = 3, placeholder }: VariableInputProps) {
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const selectionRef = useRef<[number, number]>([value.length, value.length])

  const rememberSelection = () => {
    const el = inputRef.current
    if (el) selectionRef.current = [el.selectionStart ?? value.length, el.selectionEnd ?? value.length]
  }

  const insert = (key: string) => {
    const token = `{${key}}`
    const [start, end] = selectionRef.current.map((n) => Math.min(n, value.length))
    onChange(value.slice(0, start) + token + value.slice(end))
    const caret = start + token.length
    selectionRef.current = [caret, caret]
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(caret, caret)
    })
  }

  const shared = {
    id,
    ref: inputRef,
    value,
    placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    onSelect: rememberSelection,
    onKeyUp: rememberSelection,
    onBlur: rememberSelection,
  }

  return (
    <div className="flex flex-col gap-1.5">
      {multiline ? <Textarea rows={rows} {...shared} /> : <Input {...shared} />}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="ghost" size="xs" className="self-start text-muted-foreground" />}
        >
          <BracesIcon aria-hidden="true" />
          Вставити змінну
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto min-w-56">
          {templateVariables.map((v) => (
            <DropdownMenuItem key={v.key} onClick={() => insert(v.key)}>
              <span className="flex-1">{v.label}</span>
              <code className="text-sm text-muted-foreground">{`{${v.key}}`}</code>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
