import type ExcelJS from 'exceljs'

// Matches the UN blue header and light alternating rows in sg-reports survey exports.
const BLUE = 'FF009EDB'
const LIGHT_BLUE = 'FFE6F4FA'

export function exportColumnWidth(heading: string) {
  if (heading === 'Value') return 100
  if (/URL/.test(heading)) return 48
  if (
    /Title|title|Subjects|Agenda|Programme|programme|entities|Entities/.test(
      heading
    )
  )
    return 48
  if (/Symbol|symbol|version|Version/.test(heading)) return 27
  if (heading === 'Field') return 30
  return 24
}

export function styleExportSheet(sheet: ExcelJS.Worksheet, headings: string[]) {
  sheet.columns = headings.map((heading) => ({
    width: exportColumnWidth(heading),
  }))
  const row = sheet.addRow(headings)
  row.font = {
    name: 'Calibri',
    size: 10,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  }
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } }
  row.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
  row.height = 32
  row.eachCell((cell) => {
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFB0CEDD' } } }
  })
  row.commit()
}

export function styleExportRow(
  row: ExcelJS.Row,
  headings: string[],
  even: boolean
) {
  row.font = { name: 'Calibri', size: 10 }
  row.alignment = { horizontal: 'left', vertical: 'top', wrapText: true }
  if (even)
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: LIGHT_BLUE },
    }
  let lines = 1
  row.eachCell({ includeEmpty: true }, (cell, column) => {
    cell.border = { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } }
    if (typeof cell.value === 'string') {
      const text = cell.value
      lines = Math.max(
        lines,
        ...text
          .split('\n')
          .map((line) =>
            Math.ceil(line.length / exportColumnWidth(headings[column - 1]))
          )
      )
      if (/^https?:\/\//.test(text)) {
        cell.value = { text, hyperlink: text }
        cell.font = {
          name: 'Calibri',
          size: 10,
          color: { argb: 'FF0077A8' },
          underline: true,
        }
      }
    }
    if (typeof cell.value === 'number')
      cell.numFmt = /year/i.test(headings[column - 1]) ? '0' : '#,##0'
  })
  row.height = Math.min(90, Math.max(22, lines * 15))
}
