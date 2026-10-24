'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const SHEET_WIDTH_PX = (210 * 96) / 25.4

/**
 * A strip of the A4 sheet with a header or footer image as printed: real size (210 mm wide, sheet margins), scaled
 * down to the container width. On `.paper`, so it stays paper-light in the dark theme.
 */
export function LetterheadPreview({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const [frameWidth, setFrameWidth] = useState(0)
  const [sheetHeight, setSheetHeight] = useState(0)

  useEffect(() => {
    const frame = frameRef.current
    const sheet = sheetRef.current
    if (!frame || !sheet) return
    // offsetHeight ignores the transform: the strip's own height at 210 mm.
    const observer = new ResizeObserver(() => {
      setFrameWidth(frame.clientWidth)
      setSheetHeight(sheet.offsetHeight)
    })
    observer.observe(frame)
    observer.observe(sheet)
    return () => observer.disconnect()
  }, [])

  const scale = frameWidth / SHEET_WIDTH_PX

  return (
    <div
      ref={frameRef}
      className={cn('relative overflow-hidden rounded-lg border border-border', className)}
      style={{ height: sheetHeight * scale }}
    >
      {/* Absolute: the 210 mm strip must not widen a grid or a dialog it sits in (the transform doesn't shrink its box). */}
      <div
        ref={sheetRef}
        aria-hidden="true"
        inert
        className="paper document-sheet absolute top-0 left-0 origin-top-left bg-card px-sheet-x py-sheet-top text-card-foreground select-none"
        style={{ width: SHEET_WIDTH_PX, transform: `scale(${scale})` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="block h-auto w-full" />
      </div>
    </div>
  )
}
