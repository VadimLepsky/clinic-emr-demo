import type { ImageBlock } from '@/lib/types'
import { cn } from '@/lib/utils'
import { SnapImage } from '@/components/document-sheet/grid'

const widthClass: Record<ImageBlock['width'], string> = {
  auto: 'max-w-full',
  third: 'w-1/3',
  half: 'w-1/2',
  full: 'w-full',
}

const alignClass: Record<ImageBlock['align'], string> = {
  left: 'mr-auto',
  center: 'mx-auto',
  right: 'ml-auto',
}

// The same picture in every TemplateForm mode (form, page, view, mock): part of the template, never a skeleton.
// `snap` (the printed sheet): its box is rounded up to whole grid lines, so the text after it stays on the grid.
export function ImageBlockView({ block, snap = false }: { block: ImageBlock; snap?: boolean }) {
  if (!block.src) return null
  const imgClassName = cn('block h-auto', widthClass[block.width], alignClass[block.align])
  return (
    <figure className="break-inside-avoid">
      {snap ? (
        <SnapImage src={block.src} alt={block.alt} imgClassName={cn(imgClassName, block.width === 'auto' && 'w-auto')} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={block.src} alt={block.alt} className={imgClassName} />
      )}
    </figure>
  )
}
