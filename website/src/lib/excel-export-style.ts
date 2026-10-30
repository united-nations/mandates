import type ExcelJS from 'exceljs'

// Matches the UN blue header and light alternating rows in sg-reports survey exports.
const BLUE = 'FF009EDB'
const LIGHT_BLUE = 'FFE6F4FA'
const MAX_SHEET_ROWS = 1_048_576
const MAX_SHEET_HYPERLINKS = 65_530
const isWebLink = (value: unknown): value is string =>
  typeof value === 'string' && /^https?:\/\//.test(value)

/** Retain all records; excess hyperlinks stay as text on the same worksheet. */
export function createExportTable(
  book: ExcelJS.stream.xlsx.WorkbookWriter,
  name: string,
  headings: string[]
) {
  let part = 1
  let count = 1
  let hyperlinks = 0
  const createSheet = (title: string) => {
    const worksheet = book.addWorksheet(title, {
      views: [{ state: 'frozen', ySplit: 1 }],
      properties: { tabColor: { argb: BLUE } },
    })
    styleExportSheet(worksheet, headings)
    return worksheet
  }
  let sheet = createSheet(name)
  const closeSheet = () => {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: count, column: headings.length },
    }
    sheet.commit()
  }
  return {
    row(values: unknown[]) {
      if (count === MAX_SHEET_ROWS) {
        closeSheet()
        sheet = createSheet(`${name} ${++part}`)
        count = 1
        hyperlinks = 0
      }
      const row = sheet.addRow(values)
      hyperlinks += styleExportRow(
        row,
        headings,
        count % 2 === 0,
        MAX_SHEET_HYPERLINKS - hyperlinks
      )
      row.commit()
      count++
    },
    close: closeSheet,
  }
}

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
  even: boolean,
  remainingHyperlinks = MAX_SHEET_HYPERLINKS
) {
  let hyperlinks = 0
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
      if (isWebLink(text) && hyperlinks < remainingHyperlinks) {
        hyperlinks++
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
  return hyperlinks
}
