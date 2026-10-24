'use client'

import { useState } from 'react'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import type { Block, Section } from '@/lib/types'
import { plural } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { blockChoices, createBlock, errorElementId, errorKey, sectionAnchorId, type BuilderErrors } from './builder-utils'
import { BlockEditor, blockTitle, DeleteButton } from './block-editor'
import { BlockShell, FieldTitle } from './field-editor'
import { DragHandle, SortableList } from './sortable-list'

type SectionCardProps = {
  section: Section
  onChange: (section: Section) => void
  onDelete: () => void
  errors: BuilderErrors
  createId: () => string
}

export function SectionCard({ section, onChange, onDelete, errors, createId }: SectionCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const setBlocks = (blocks: Block[]) => onChange({ ...section, blocks })
  const titleId = `tb-section-title-${section.id}`

  return (
    <section
      id={sectionAnchorId(section.id)}
      aria-labelledby={titleId}
      className="scroll-mt-10 rounded-2xl bg-card text-card-foreground dark:border dark:border-border"
    >
      <div className="flex items-center gap-3 border-b border-border px-8 py-5">
        <Label htmlFor={titleId} className="shrink-0">
          Section:
        </Label>
        <Input
          id={titleId}
          placeholder="Section title"
          value={section.title}
          className="font-medium"
          onChange={(e) => onChange({ ...section, title: e.target.value })}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete section ${section.title}`.trim()}
          onClick={() => (section.blocks.length ? setConfirmOpen(true) : onDelete())}
        >
          <Trash2Icon aria-hidden="true" />
        </Button>
      </div>

      <div className="flex flex-col gap-4 px-8 py-6">
        {section.blocks.length > 0 ? (
          <SortableList items={section.blocks} getId={(b) => b.id} onReorder={setBlocks} className="gap-3">
            {(block, handle) => (
              <BlockShell
                id={errorElementId(errorKey(block.id, 'id'))}
                invalid={Boolean(errors[errorKey(block.id, 'id')])}
                title={block.kind === 'field' ? <FieldTitle field={block} /> : blockTitle(block)}
                handle={<DragHandle {...handle} label={`Move: ${blockTitle(block)}`} />}
                actions={
                  <DeleteButton
                    label={`Delete: ${blockTitle(block)}`}
                    onClick={() => setBlocks(section.blocks.filter((b) => b.id !== block.id))}
                  />
                }
              >
                <BlockEditor
                  block={block}
                  errors={errors}
                  createId={createId}
                  onChange={(next) => setBlocks(section.blocks.map((b) => (b.id === next.id ? next : b)))}
                />
                {errors[errorKey(block.id, 'id')] && (
                  <p className="mt-2 text-sm text-destructive">{errors[errorKey(block.id, 'id')]}</p>
                )}
              </BlockShell>
            )}
          </SortableList>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-muted-foreground">
            Add the first block to the section.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Add:</span>
          {blockChoices.map((choice) => (
            <Button
              key={choice.value}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBlocks([...section.blocks, createBlock(choice.value, createId())])}
            >
              <PlusIcon aria-hidden="true" />
              {choice.label}
            </Button>
          ))}
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete section?</DialogTitle>
            <DialogDescription>
              {`Section «${section.title || 'Untitled'}» has ${plural(section.blocks.length, 'block')}. They will be deleted with the section.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false)
                onDelete()
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
