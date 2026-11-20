import assert from 'node:assert/strict'
import test from 'node:test'
import { withRequestQueryCache } from '#lib/db/request-query-cache'
import { sharePublicRead } from '#lib/db/share-public-read'
import { withPerformanceTrace } from '#lib/perf/trace-context'

test('overlapping public reads share only matching SQL and bindings', async () => {
  let calls = 0
  const gate = Promise.withResolvers<void>()
  const read = sharePublicRead(async () => {
    const value = ++calls
    await gate.promise
    return value
  })
  const requests = Array.from({ length: 100 }, () =>
    withRequestQueryCache(() => read('select $1', ['a']))
  )
  const otherBindings = read('select $1', ['b'])
  const otherSql = read('select distinct $1', ['a'])
  const traced = withPerformanceTrace(
    { bypassDynamicCache: true, id: 'isolated', route: '/secretariat' },
    () => read('select $1', ['a'])
  )
  gate.resolve()
  assert.deepEqual(await Promise.all(requests), Array(100).fill(1))
  assert.equal(await otherBindings, 2)
  assert.equal(await otherSql, 3)
  assert.equal((await traced).value, 4)
  assert.equal(await read('select $1', ['a']), 5)
})

test('a failed shared read can be retried', async () => {
  let attempts = 0
  const read = sharePublicRead(async () => {
    if (++attempts === 1) throw new Error('pool busy')
    return 42
  })
  const failures = await Promise.allSettled([
    read('count', []),
    read('count', []),
  ])
  assert.deepEqual(
    failures.map((result) => result.status),
    ['rejected', 'rejected']
  )
  assert.equal(await read('count', []), 42)
  assert.equal(attempts, 2)
})
