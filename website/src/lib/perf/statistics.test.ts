import assert from 'node:assert/strict'
import test from 'node:test'

import { numericSummary } from '#lib/perf/statistics'

test('numericSummary reports min, median, and max for odd samples', () => {
  assert.deepEqual(numericSummary([9, 1, 5]), {
    max: 9,
    median: 5,
    min: 1,
  })
})

test('numericSummary averages the middle pair for even samples', () => {
  assert.deepEqual(numericSummary([9, 1, 5, 3]), {
    max: 9,
    median: 4,
    min: 1,
  })
})

test('numericSummary rejects an empty sample', () => {
  assert.throws(() => numericSummary([]), /at least one value/)
})
