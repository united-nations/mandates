import { test } from 'node:test'
import assert from 'node:assert/strict'
import { csvCell, csvRow } from '#lib/export-format'

test('CSV preserves commas, quotes, newlines and Unicode', () => {
  assert.equal(
    csvRow(['A, B', 'a"b', 'a\nb', '联合国']),
    '"A, B","a""b","a\nb","联合国"\r\n'
  )
})
test('CSV neutralizes spreadsheet formula injection without changing numbers', () => {
  for (const input of ['=SUM(1,1)', '+cmd', '-cmd', '@cmd', '  =1+1', '\t=1+1'])
    assert.ok(csvCell(input).startsWith('"\''))
  assert.equal(csvCell(-12), '"-12"')
  assert.equal(csvCell(null), '""')
})
