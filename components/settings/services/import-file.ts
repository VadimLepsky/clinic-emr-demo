import type { PriceImportRow } from '@/lib/data'

export type SpreadsheetTable = { headers: string[]; rows: string[][] }

export type ColumnMapping = { code: string; name: string; price: string }

export const NO_COLUMN = 'none'

export async function parseSpreadsheet(file: File): Promise<SpreadsheetTable> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) throw new Error('Файл не містить аркушів')
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '', blankrows: false })
  const cells = matrix.map((row) => row.map((cell) => String(cell ?? '').trim()))
  const headerIndex = cells.findIndex((row) => row.some(Boolean))
  if (headerIndex === -1) throw new Error('Файл порожній')
  const headers = cells[headerIndex].map((h, i) => h || `Колонка ${i + 1}`)
  const rows = cells.slice(headerIndex + 1).filter((row) => row.some(Boolean))
  if (!rows.length) throw new Error('У файлі немає рядків з даними')
  return { headers, rows }
}

export function guessMapping(headers: string[]): ColumnMapping {
  const find = (pattern: RegExp) => {
    const index = headers.findIndex((h) => pattern.test(h))
    return index === -1 ? NO_COLUMN : String(index)
  }
  return {
    code: find(/^(код|code|артикул|№|id)|код\b|\bcode\b/i),
    name: find(/назв|найменув|послуг|аналіз|name|title|service/i),
    price: find(/цін|ціна|вартіст|price|cost|грн|сума/i),
  }
}

export function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[\s\u00a0]/g, '').replace(/(грн|uah|₴)\.?/gi, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

export function buildImportRows(
  table: SpreadsheetTable,
  mapping: ColumnMapping,
): { rows: PriceImportRow[]; skipped: number } {
  const nameIndex = Number(mapping.name)
  const priceIndex = Number(mapping.price)
  const codeIndex = mapping.code === NO_COLUMN ? -1 : Number(mapping.code)
  const rows: PriceImportRow[] = []
  let skipped = 0
  for (const row of table.rows) {
    const name = row[nameIndex]?.trim()
    const price = parsePrice(row[priceIndex] ?? '')
    if (!name || price === null) {
      skipped++
      continue
    }
    rows.push({ code: codeIndex === -1 ? null : row[codeIndex]?.trim() || null, name, price })
  }
  return { rows, skipped }
}
