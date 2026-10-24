import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// text-body и text-doc* (лист А4) — размеры шрифта из globals.css; без этого twMerge считает их цветом и выкидывает
// при слиянии (или выкидывает цвет текста рядом с ними).
const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ['body', 'doc', 'doc-title', 'doc-small'] }] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
