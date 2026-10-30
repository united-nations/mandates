/** Spreadsheet-safe RFC 4180 cells. Keep numbers numeric; neutralize text formulas. */
export function csvCell(value: unknown): string {
  let text =
    value == null
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value)
  if (typeof value !== 'number' && /^[\s]*[=+\-@\t\r\n]/.test(text))
    text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}
export function csvRow(values: unknown[]) {
  return values.map(csvCell).join(',') + '\r\n'
}

export function downloadName(format: string, generatedAt: string) {
  return `un-mandates-${generatedAt.slice(0, 10)}.${format}`
}
