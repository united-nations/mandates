import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildBenchmarkFailure,
  digestArtifact,
} from '#lib/perf/benchmark-result'
import type { PerformanceTrace } from '#lib/perf/types'

const failedTrace: PerformanceTrace = {
  bypassDynamicCache: true,
  durationMs: 30_000,
  id: 'failed',
  queries: [
    {
      caller: 'mandates.list',
      error: 'Query read timeout',
      executionMs: 30_000,
      fingerprint: 'slow-query',
      finishedAtMs: 30_000,
      params: [],
      pool: { idle: 0, total: 15, waiting: 0 },
      rowCount: null,
      sql: 'select 1',
      startedAtMs: 0,
      totalMs: 30_000,
      waitMs: 0,
    },
  ],
  route: '/secretariat',
  spans: [],
  startedAtEpochMs: 0,
}

test('digestArtifact is deterministic and includes serialized bytes', () => {
  const first = digestArtifact({ cards: [1, 2], count: 43_912 })
  const second = digestArtifact({ cards: [1, 2], count: 43_912 })

  assert.deepEqual(first, second)
  assert.equal(first.bytes, 29)
  assert.match(first.digest, /^[a-f0-9]{64}$/)
})

test('digestArtifact changes when output changes', () => {
  const first = digestArtifact({ count: 1 })
  const second = digestArtifact({ count: 2 })

  assert.notEqual(first.digest, second.digest)
})

test('buildBenchmarkFailure preserves the partial query summary', () => {
  const result = buildBenchmarkFailure(failedTrace, 'Query read timeout')

  assert.equal(result.error, 'Query read timeout')
  assert.equal(result.querySummary.queryCount, 1)
  assert.equal(result.artifact, undefined)
})
