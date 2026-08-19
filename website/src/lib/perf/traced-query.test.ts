import assert from 'node:assert/strict'
import test from 'node:test'

import { queryCaller } from '#lib/perf/traced-query'

test('queryCaller identifies the first data-layer call site', () => {
  const stack = [
    'Error',
    '    at query (src/lib/db/query.ts:12:10)',
    '    at getMandates (src/lib/data/mandates.ts:862:22)',
    '    at render (src/app/secretariat/page.tsx:49:3)',
  ].join('\n')

  assert.equal(queryCaller(stack), 'mandates.ts:862')
})

test('queryCaller reports unknown when no data-layer frame exists', () => {
  assert.equal(
    queryCaller('Error\n at query (src/lib/db/query.ts:12:10)'),
    'unknown'
  )
})

test('queryCaller prefers an explicit SQL trace label', () => {
  assert.equal(
    queryCaller(
      'compiled production stack',
      '/* trace:mandates.list */ select 1'
    ),
    'mandates.list'
  )
})
