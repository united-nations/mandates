import assert from 'node:assert/strict'
import test from 'node:test'

import { allSettledOrThrow } from '#lib/perf/all-settled'

test('allSettledOrThrow returns ordered values', async () => {
  const values = await allSettledOrThrow([
    Promise.resolve(1),
    Promise.resolve('two'),
  ] as const)

  assert.deepEqual(values, [1, 'two'])
})

test('allSettledOrThrow waits for other work before rejecting', async () => {
  let finished = false
  const later = Promise.resolve().then(() => {
    finished = true
  })

  await assert.rejects(
    allSettledOrThrow([Promise.reject(new Error('failed')), later] as const),
    /failed/
  )
  assert.equal(finished, true)
})
