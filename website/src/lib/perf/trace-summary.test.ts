import assert from 'node:assert/strict'
import test from 'node:test'

import { fingerprintSql, summarizeQueries } from '#lib/perf/trace-summary'
import type { QueryTrace } from '#lib/perf/types'

const query = (
  startedAtMs: number,
  waitMs: number,
  executionMs: number
): QueryTrace => ({
  caller: 'test',
  executionMs,
  fingerprint: 'abc123',
  finishedAtMs: startedAtMs + waitMs + executionMs,
  params: [],
  pool: { idle: 0, total: 1, waiting: 0 },
  rowCount: 1,
  sql: 'select 1',
  startedAtMs,
  totalMs: waitMs + executionMs,
  waitMs,
})

test('summarizeQueries accounts for time and peak concurrency', () => {
  const summary = summarizeQueries([
    query(0, 5, 20),
    query(10, 0, 20),
    query(31, 2, 7),
  ])

  assert.deepEqual(summary, {
    executionMs: 47,
    maxConcurrent: 2,
    maxExecutionMs: 20,
    maxWaitMs: 5,
    queryCount: 3,
    totalMs: 54,
    waitMs: 7,
  })
})

test('fingerprintSql ignores formatting-only whitespace', () => {
  const compact = fingerprintSql('select * from documents where id = $1')
  const formatted = fingerprintSql(`
    select  *
    from documents
    where id = $1
  `)

  assert.equal(formatted, compact)
})
