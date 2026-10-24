'use client'

import { PlusIcon, Trash2Icon } from 'lucide-react'
import type { Block, FieldBlock, GroupBlock, ImageBlock, ServicesBlock } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageUploadField } from '@/components/image-upload-field'
import {
  createField,
  errorElementId,
  errorKey,
  imageAlignOptions,
  imageWidthOptions,
  serviceCategoryOptions,
  type BuilderErrors,
} from './builder-utils'
import { BlockShell, FieldEditor, FieldTitle, fieldTitleText } from './field-editor'
import { DragHandle, SortableList } from './sortable-list'
import { VariableInput } from './variable-input'

type BlockEditorProps<T extends Block = Block> = {
  block: T
  onChange: (block: T) => void
  errors: BuilderErrors
  createId: () => string
}

const groupFieldChoices = [
  { value: 'text', label: 'Текстове поле' },
  { value: 'select', label: 'Випадаючий список' },
  { value: 'checkbox', label: 'Чекбокс' },
] as const

function DeleteButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="icon-sm" aria-label={label} onClick={onClick}>
      <Trash2Icon aria-hidden="true" />
    </Button>
  )
}

function GroupEditor({ block, onChange, errors, createId }: BlockEditorProps<GroupBlock>) {
  const setFields = (blocks: FieldBlock[]) => onChange({ ...block, blocks })
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`tb-group-${block.id}`}>Назва секції</Label>
        <Input
          id={`tb-group-${block.id}`}
          placeholder="Напр., Розміри"
          value={block.title}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
        />
      </div>
      {block.blocks.length > 0 ? (
        <SortableList items={block.blocks} getId={(f) => f.id} onReorder={setFields} className="gap-2">
          {(field, handle) => (
            <BlockShell
              id={errorElementId(errorKey(field.id, 'id'))}
              invalid={Boolean(errors[errorKey(field.id, 'id')])}
              className="bg-muted/40"
              title={<FieldTitle field={field} />}
              handle={<DragHandle {...handle} label={`Перемістити: ${fieldTitleText(field)}`} />}
              actions={
                <DeleteButton
                  label={`Видалити: ${fieldTitleText(field)}`}
                  onClick={() => setFields(block.blocks.filter((f) => f.id !== field.id))}
                />
              }
            >
              <FieldEditor
                field={field}
                errors={errors}
                onChange={(next) => setFields(block.blocks.map((f) => (f.id === next.id ? next : f)))}
              />
            </BlockShell>
          )}
        </SortableList>
      ) : (
        <p className="text-sm text-muted-foreground">У секції ще немає полів.</p>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" className="self-start" />}>
          <PlusIcon aria-hidden="true" />
          Поле
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto">
          {groupFieldChoices.map((choice) => (
            <DropdownMenuItem key={choice.value} onClick={() => setFields([...block.blocks, createField(choice.value, createId())])}>
              {choice.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function ServicesEditor({ block, onChange, errors }: BlockEditorProps<ServicesBlock>) {
  const key = errorKey(block.id, 'label')
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={errorElementId(key)}>
          Назва блоку <span className="text-destructive">*</span>
        </Label>
        <Input
          id={errorElementId(key)}
          value={block.label}
          aria-invalid={Boolean(errors[key])}
          onChange={(e) => onChange({ ...block, label: e.target.value })}
        />
        {errors[key] && <p className="text-sm text-destructive">{errors[key]}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`tb-cat-${block.id}`}>Категорія</Label>
        <Select
          items={serviceCategoryOptions}
          value={block.category}
          onValueChange={(v) => v && onChange({ ...block, category: v as ServicesBlock['category'] })}
        >
          <SelectTrigger id={`tb-cat-${block.id}`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {serviceCategoryOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function ImageEditor({ block, onChange, errors }: BlockEditorProps<ImageBlock>) {
  const srcKey = errorKey(block.id, 'src')
  return (
    <div className="flex flex-col gap-4">
      <div id={errorElementId(srcKey)} tabIndex={-1} className="flex flex-col gap-1.5 outline-none">
        <ImageUploadField
          label="Зображення"
          value={block.src || null}
          onChange={(src) => onChange({ ...block, src: src ?? '' })}
          previewClassName="h-40 w-full"
        />
        {errors[srcKey] && <p className="text-sm text-destructive">{errors[srcKey]}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`tb-img-alt-${block.id}`}>Опис для друку / доступності</Label>
        <Input
          id={`tb-img-alt-${block.id}`}
          placeholder="Напр., Схема розташування вузлів"
          value={block.alt}
          onChange={(e) => onChange({ ...block, alt: e.target.value })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`tb-img-width-${block.id}`}>Ширина</Label>
          <Select
            items={imageWidthOptions}
            value={block.width}
            onValueChange={(v) => v && onChange({ ...block, width: v as ImageBlock['width'] })}
          >
            <SelectTrigger id={`tb-img-width-${block.id}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {imageWidthOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`tb-img-align-${block.id}`}>Вирівнювання</Label>
          <Select
            items={imageAlignOptions}
            value={block.align}
            onValueChange={(v) => v && onChange({ ...block, align: v as ImageBlock['align'] })}
          >
            <SelectTrigger id={`tb-img-align-${block.id}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {imageAlignOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

/** The block's title as text (drag and delete buttons); a field's visible title is FieldTitle. */
export function blockTitle(block: Block) {
  switch (block.kind) {
    case 'field':
      return fieldTitleText(block)
    case 'group':
      return `Секція${block.title ? ` · ${block.title}` : ''}`
    case 'static':
      return 'Текст зі змінними'
    case 'services':
      return `Рекомендовані послуги · ${block.label}`
    case 'image':
      return `Зображення${block.alt ? ` · ${block.alt}` : ''}`
  }
}

export function BlockEditor({ block, onChange, errors, createId }: BlockEditorProps) {
  switch (block.kind) {
    case 'field':
      return <FieldEditor field={block} onChange={onChange} errors={errors} />
    case 'group':
      return <GroupEditor block={block} onChange={onChange} errors={errors} createId={createId} />
    case 'services':
      return <ServicesEditor block={block} onChange={onChange} errors={errors} createId={createId} />
    case 'image':
      return <ImageEditor block={block} onChange={onChange} errors={errors} createId={createId} />
    case 'static':
      return (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`tb-static-${block.id}`}>Текст</Label>
          <VariableInput
            id={`tb-static-${block.id}`}
            multiline
            rows={4}
            value={block.text}
            onChange={(text) => onChange({ ...block, text })}
          />
        </div>
      )
  }
}

export { DeleteButton }
