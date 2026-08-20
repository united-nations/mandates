import assert from 'node:assert/strict'
import test from 'node:test'

import { readDynamicCache } from '#lib/perf/dynamic-cache'
import { withPerformanceTrace } from '#lib/perf/trace-context'

test('benchmark context bypasses the persistent dynamic cache', async () => {
  let calls = 0
  const load = async () => ++calls

  const result = await withPerformanceTrace(
    { bypassDynamicCache: true, id: 'cache-off', route: '/test' },
    async () => [
      await readDynamicCache(load, ['test-key'], { revalidate: 3600 }),
      await readDynamicCache(load, ['test-key'], { revalidate: 3600 }),
    ]
  )

  assert.deepEqual(result.value, [1, 2])
})
