'use client'

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DocGridOverlay, sheetGridClass, sheetPaperClass, subgridClass } from './grid'

/** One unbreakable piece of a document: `space` — lines before it (dropped at the top of a page); `keepWithNext` —
 *  never the last thing on a page (a section bar stays with its first field). */
export type SheetAtom = { key: string; space: number; keepWithNext?: boolean; node: ReactNode }

const pageClass = cn(
  sheetPaperClass,
  sheetGridClass,
  'w-[210mm] min-h-[297mm] shrink-0 px-sheet-x pt-sheet-top pb-sheet-bottom shadow-md',
)

/**
 * The document as A4 pages, on screen exactly as printed: the atoms are measured once (an invisible page), laid out
 * page by page, and every page is a real 210 × 297 mm sheet with a gap between them. The footer sits at the bottom of
 * the last page (at least half a line below the text). Printing prints the same pages, one per sheet of paper.
 */
export function PagedSheet({ atoms, footer, className }: { atoms: SheetAtom[]; footer: ReactNode; className?: string }) {
  const measureRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<number[][] | null>(null)

  const paginate = useCallback(() => {
    const sheet = measureRef.current
    if (!sheet) return
    const cs = getComputedStyle(sheet)
    const capacity = sheet.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    const probe = document.createElement('div')
    probe.style.cssText = 'position:absolute;visibility:hidden;height:var(--doc-line)'
    sheet.append(probe)
    const line = probe.getBoundingClientRect().height
    probe.remove()
    const heights = [...sheet.querySelectorAll<HTMLElement>('[data-atom]')].map((el) => el.getBoundingClientRect().height)
    const footerEl = sheet.querySelector<HTMLElement>('[data-atom-footer]')
    // The footer keeps at least half a line from the text above it.
    const footerHeight = footerEl ? footerEl.getBoundingClientRect().height + line / 2 : 0
    if (!line || heights.length !== atoms.length) return

    const next: number[][] = [[]]
    let used = 0
    atoms.forEach((atom, i) => {
      const page = next[next.length - 1]
      const space = page.length ? atom.space * line : 0
      // A kept-together pair moves on as a whole.
      const following = atom.keepWithNext && i + 1 < atoms.length ? atoms[i + 1].space * line + heights[i + 1] : 0
      if (page.length && used + space + heights[i] + following > capacity + 0.5) {
        next.push([i])
        used = heights[i]
        return
      }
      page.push(i)
      used += space + heights[i]
    })
    // The footer needs room on the last page; otherwise it goes to a page of its own.
    if (footerHeight && used + footerHeight > capacity + 0.5) next.push([])

    setPages((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
  }, [atoms])

  useLayoutEffect(() => {
    paginate()
    const sheet = measureRef.current
    if (!sheet) return
    // Images (header, footer, image blocks) settle after load and change the heights.
    const observer = new ResizeObserver(paginate)
    sheet.querySelectorAll('[data-atom], [data-atom-footer]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [paginate])

  // Until measured (and on the server): one page with everything.
  const layout = pages ?? [atoms.map((_, i) => i)]

  return (
    <div className="relative flex flex-col items-center gap-[8mm] print:block">
      {layout.map((indexes, p) => (
        <article
          key={p}
          aria-label={layout.length > 1 ? `Page ${p + 1} of ${layout.length}` : undefined}
          className={cn(pageClass, p < layout.length - 1 && 'print:break-after-page', className)}
        >
          <DocGridOverlay />
          <div className={subgridClass}>
            {indexes.map((i, n) => (
              <div
                key={atoms[i].key}
                className={subgridClass}
                style={{ marginTop: n === 0 ? 0 : `calc(var(--doc-line) * ${atoms[i].space})` }}
              >
                {atoms[i].node}
              </div>
            ))}
          </div>
          {p === layout.length - 1 && footer && <div className="col-span-full pt-half-line">{footer}</div>}
        </article>
      ))}

      {/* The measuring page: same width, margins and type, never shown, never printed. */}
      <div
        ref={measureRef}
        aria-hidden="true"
        inert
        className={cn(pageClass, 'pointer-events-none invisible absolute top-0 left-0 h-[297mm] overflow-hidden print:hidden', className)}
      >
        <div className={subgridClass}>
          {atoms.map((atom) => (
            <div key={atom.key} data-atom className={subgridClass}>
              {atom.node}
            </div>
          ))}
          {footer && (
            <div data-atom-footer className="col-span-full">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
