import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// text-body and text-doc* (A4 sheet) are font sizes from globals.css; without this twMerge takes them for a color and
// drops them when merging (or drops the text color next to them).
const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ['body', 'doc', 'doc-title', 'doc-small'] }] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
