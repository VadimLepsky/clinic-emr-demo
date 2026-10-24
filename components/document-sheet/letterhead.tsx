import { SnapImage } from './grid'

// Header and footer of an A4 sheet (висновок, призначення): always an image across the content width — a
// letterhead from the library (templates) or the prescription blank (Налаштування → Шапки і підвали).
// The header's box is rounded up to half grid lines (the picture is never stretched), so the text stays on the grid.

export function SheetHeader({ src, alt }: { src: string; alt: string }) {
  return (
    <header className="break-inside-avoid">
      <SnapImage src={src} alt={alt} />
    </header>
  )
}

/** The last thing on the sheet, at its natural height: pinned to the bottom margin (6mm), nothing comes after it. */
export function SheetFooterImage({ src, alt }: { src: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="block h-auto w-full break-inside-avoid" />
}
