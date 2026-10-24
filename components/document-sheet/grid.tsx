'use client'

import { Fragment, useCallback, useEffect, useRef, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

// The document grid (AGENTS.md → Document grid): A4 sheets are a 12-column grid with a 16pt baseline
// (--doc-cols, --doc-gutter, --doc-line in globals.css). Everything vertical is whole lines or halves.

/** Every sheet is paper: the light palette (.paper) in both themes, white in print — headers and footers are images
 *  made for a white sheet. Popovers opened from it are portaled out and keep the interface theme. */
export const sheetPaperClass = 'paper document-sheet bg-card text-card-foreground'

/** The sheet itself: 12 columns, the body takes the free space so the footer sits at the bottom of the page. */
export const sheetGridClass =
  'relative grid grid-cols-[repeat(var(--doc-cols),minmax(0,1fr))] grid-rows-[1fr_auto] gap-x-gutter text-doc'

/** A full-width row of the sheet that passes the 12 columns on to its children (each spans all of them by default). */
export const subgridClass = 'col-span-full grid grid-cols-subgrid content-start [&>*]:col-span-full'

/** A bar (section title, table header) whose background bleeds half a gutter past the columns, so its text starts
 *  exactly at the first column. --sheet-bar, kept in print (print-color-adjust: exact on .document-sheet). */
export const bleedBarClass =
  'relative isolate before:absolute before:inset-y-0 before:-inset-x-[calc(var(--doc-gutter)/2)] before:-z-10 before:bg-sheet-bar'

/** A section bar: one and a half lines, the text centered vertically. */
export const sectionBarClass = cn(bleedBarClass, 'flex min-h-[calc(var(--doc-line)*1.5)] items-center font-semibold')

/**
 * An image whose box is rounded up to half grid lines: the picture keeps its proportions (never stretched), the
 * box below it fills up to the next half line, so the text after it stays on the grid.
 */
export function SnapImage({
  src,
  alt,
  className,
  imgClassName,
}: {
  src: string
  alt: string
  className?: string
  imgClassName?: string
}) {
  const boxRef = useRef<HTMLDivElement>(null)

  const snap = useCallback(() => {
    const box = boxRef.current
    const img = box?.querySelector('img')
    if (!box || !img || !img.complete || !img.naturalWidth) return
    // Measured in the same coordinates as the image, so scaled previews (transform) round the same way.
    const probe = document.createElement('div')
    probe.style.cssText = 'position:absolute;visibility:hidden;width:1px;height:var(--doc-line)'
    box.append(probe)
    const line = probe.getBoundingClientRect().height
    probe.remove()
    if (!line) return
    const halves = Math.max(1, Math.ceil((img.getBoundingClientRect().height / line) * 2 - 0.01))
    box.style.height = `calc(var(--doc-line) * ${halves / 2})`
  }, [])

  useEffect(() => {
    const img = boxRef.current?.querySelector('img')
    if (!img) return
    snap()
    // The rendered height follows the width (responsive previews), so it is re-rounded on resize.
    const observer = new ResizeObserver(snap)
    observer.observe(img)
    return () => observer.disconnect()
  }, [snap, src])

  return (
    <div ref={boxRef} className={cn('overflow-hidden', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} onLoad={snap} className={cn('block h-auto w-full', imgClassName)} />
    </div>
  )
}

/**
 * The patient block: label 2 columns + value 4 columns, twice (left and right), one line per row, no frame.
 * Sits in the sheet's 12 columns, so its edges are the same in every document.
 */
export function SheetInfoGrid({
  left,
  right,
  className,
}: {
  left: [string, string][]
  right: [string, string][]
  className?: string
}) {
  const rows = Math.max(left.length, right.length)
  const place = (column: string, row: number): CSSProperties => ({ gridColumn: column, gridRow: row + 1 })
  return (
    <dl className={cn('col-span-full grid grid-cols-subgrid tabular-nums break-inside-avoid', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <Fragment key={i}>
          {left[i] && (
            <>
              <dt style={place('1 / span 2', i)}>{`${left[i][0]}:`}</dt>
              <dd style={place('3 / span 4', i)}>{left[i][1]}</dd>
            </>
          )}
          {right[i] && (
            <>
              <dt style={place('7 / span 2', i)}>{`${right[i][0]}:`}</dt>
              <dd style={place('9 / span 4', i)}>{right[i][1]}</dd>
            </>
          )}
        </Fragment>
      ))}
    </dl>
  )
}

// ---- Debug overlay (development only): G or ?grid=1 shows the lines and the columns over every sheet.

let gridToggleInstalled = false

function installGridToggle() {
  const root = document.documentElement
  if (new URLSearchParams(window.location.search).get('grid') === '1') root.dataset.docGrid = ''
  if (gridToggleInstalled) return
  gridToggleInstalled = true
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyG' || e.metaKey || e.ctrlKey || e.altKey) return
    const target = e.target as HTMLElement | null
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
    if ('docGrid' in root.dataset) delete root.dataset.docGrid
    else root.dataset.docGrid = ''
  })
}

const gridLines = 'color-mix(in srgb, var(--destructive) 40%, transparent)'
const gridColumns = 'color-mix(in srgb, var(--primary) 10%, transparent)'
const columnWidth = 'calc((100% - (var(--doc-cols) - 1) * var(--doc-gutter)) / var(--doc-cols))'

function DevGridOverlay() {
  useEffect(installGridToggle, [])
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-sheet-x top-sheet-top bottom-sheet-bottom z-10 hidden print:!hidden [[data-doc-grid]_&]:block"
      style={{
        backgroundImage: [
          `repeating-linear-gradient(to bottom, transparent 0 calc(var(--doc-line) - 1px), ${gridLines} calc(var(--doc-line) - 1px) var(--doc-line))`,
          `repeating-linear-gradient(to right, ${gridColumns} 0 ${columnWidth}, transparent ${columnWidth} calc(${columnWidth} + var(--doc-gutter)))`,
        ].join(', '),
      }}
    />
  )
}

/** Put inside a sheet (it needs `relative`); renders nothing in production and never prints. */
export function DocGridOverlay() {
  return process.env.NODE_ENV === 'development' ? <DevGridOverlay /> : null
}
