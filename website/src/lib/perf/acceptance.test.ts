import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluatePerformanceAcceptance } from '#lib/perf/acceptance'

const run = (mode: 'off' | 'warm', wallMs: number, queryCount: number) => ({
  scenario: 'default',
  mode,
  wallMs,
  querySummary: { queryCount },
  artifact: { digest: 'same' },
})

test('passes when every measured threshold is met', () => {
  const result = evaluatePerformanceAcceptance({
    runs: [
      run('off', 1900, 5),
      run('off', 1700, 5),
      run('off', 1800, 5),
      run('warm', 20, 0),
    ],
  })

  assert.equal(result.passed, true)
  assert.deepEqual(result.failures, [])
})

test('reports timeouts, latency, query fan-out, and digest drift', () => {
  const bad = run('off', 2200, 9)
  const result = evaluatePerformanceAcceptance({
    runs: [
      { ...bad, error: 'timeout' },
      { ...bad, artifact: { digest: 'changed' } },
      run('off', 2100, 9),
      run('warm', 120, 0),
    ],
  })

  assert.equal(result.passed, false)
  assert.equal(result.failures.length, 5)
})
