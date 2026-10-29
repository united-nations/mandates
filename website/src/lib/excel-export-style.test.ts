import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PassThrough, Readable } from 'node:stream'
import ExcelJS from 'exceljs'
import { createExportTable } from '#lib/excel-export-style'

test('large Excel exports split before the hyperlink ceiling without losing rows or links', async () => {
  const stream = new PassThrough()
  const chunks: Buffer[] = []
  stream.on('data', (chunk: Buffer) => chunks.push(chunk))
  const writer = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream,
    useStyles: true,
  })
  const headings = ['Symbol', 'Source URL', 'Registry URL', 'JSON URL']
  const table = createExportTable(writer, 'Documents', headings)
  const total = 21_845 // Three links per row cross the 65,530 worksheet limit.
  for (let index = 0; index < total; index++)
    table.row([
      `A/${index}`,
      `https://example.org/source/${index}`,
      `https://example.org/document/${index}`,
      `https://example.org/json/${index}`,
    ])
  table.close()
  await writer.commit()

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.read(Readable.from([Buffer.concat(chunks)]))
  assert.equal(workbook.worksheets.length, 2)
  let records = 0
  let links = 0
  for (const sheet of workbook.worksheets) {
    assert.deepEqual(
      headings.map((_, index) => sheet.getRow(1).getCell(index + 1).value),
      headings
    )
    assert.equal(sheet.views[0].state, 'frozen')
    let sheetLinks = 0
    sheet.eachRow((row, index) => {
      if (index === 1) return
      assert.equal(row.getCell(1).value, `A/${records++}`)
      row.eachCell((cell) => {
        if (cell.type === ExcelJS.ValueType.Hyperlink) sheetLinks++
      })
    })
    assert.ok(sheetLinks <= 65_530)
    links += sheetLinks
  }
  assert.equal(records, total)
  assert.equal(links, total * 3)
})
