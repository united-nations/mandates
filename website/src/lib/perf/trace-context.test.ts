import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isDynamicCacheBypassed,
  recordQueryTrace,
  trackPerformanceQuery,
  traceSpan,
  withPerformanceTrace,
} from '#lib/perf/trace-context'
import type { QueryTrace } from '#lib/perf/types'

const tracedQuery: QueryTrace = {
  caller: 'test',
  executionMs: 8,
  fingerprint: 'query-1',
  finishedAtMs: 10,
  params: [],
  pool: { idle: 0, total: 1, waiting: 0 },
  rowCount: 2,
  sql: 'select 1',
  startedAtMs: 1,
  totalMs: 9,
  waitMs: 1,
}

test('performance context collects spans and query traces', async () => {
  const result = await withPerformanceTrace(
    { bypassDynamicCache: true, id: 'run-1', route: '/secretariat' },
    async () => {
      assert.equal(isDynamicCacheBypassed(), true)
      recordQueryTrace(tracedQuery)
      return traceSpan('cards', async () => 42)
    }
  )

  assert.equal(result.value, 42)
  assert.equal(result.trace.queries.length, 1)
  assert.equal(result.trace.spans[0]?.name, 'cards')
  assert.equal(isDynamicCacheBypassed(), false)
})

test('recordQueryTrace is inert outside a trace context', () => {
  assert.doesNotThrow(() => recordQueryTrace(tracedQuery))
})

test('performance context returns the partial trace when work fails', async () => {
  let backgroundFinished = false
  const result = await withPerformanceTrace(
    { bypassDynamicCache: true, id: 'failed', route: '/secretariat' },
    async () => {
      recordQueryTrace({ ...tracedQuery, error: 'Query read timeout' })
      void trackPerformanceQuery(
        () =>
          new Promise<void>((resolve) => {
            queueMicrotask(() => {
              backgroundFinished = true
              resolve()
            })
          })
      )
      throw new Error('Query read timeout')
    }
  )

  assert.equal(result.error, 'Query read timeout')
  assert.equal(backgroundFinished, true)
  assert.equal(result.trace.queries[0]?.error, 'Query read timeout')
  assert.ok(result.trace.durationMs >= 0)
})
