import assert from 'node:assert/strict'
import { test } from 'node:test'
import { searchTableRows } from '#lib/table-search'

const rows = [
  { id: 'group', title: 'Regional bodies' },
  { id: 'esc', parentId: 'group', title: 'Economic and Social Commission' },
  { id: 'other', parentId: 'group', title: 'Economic development' },
]

test('table search requires every word without requiring adjacency or order', () => {
  for (const query of [
    'economic commission',
    'COMMISSION economic',
    ' economic  commission ',
  ]) {
    assert.deepEqual(
      searchTableRows(rows, query, (row) => row.title).map((row) => row.id),
      ['group', 'esc']
    )
  }
})

test('table search supports exact phrases, exclusions and empty queries', () => {
  assert.deepEqual(
    searchTableRows(rows, '"economic commission"', (row) => row.title),
    []
  )
  assert.deepEqual(
    searchTableRows(rows, 'economic -social', (row) => row.title).map(
      (row) => row.id
    ),
    ['group', 'other']
  )
  assert.deepEqual(
    searchTableRows(rows, ' ', (row) => row.title),
    rows
  )
})

test('a matching heading keeps its branch in source order', () => {
  assert.deepEqual(
    searchTableRows(rows, 'regional bodies', (row) => row.title),
    rows
  )
})

test('matching ancestors cannot reintroduce excluded descendants', () => {
  for (const query of ['regional -social', '-social']) {
    assert.deepEqual(
      searchTableRows(rows, query, (row) => row.title).map((row) => row.id),
      ['group', 'other']
    )
  }
})
