import assert from 'node:assert/strict'
import test from 'node:test'

import {
  readRequestQueryCache,
  requestQueryKey,
  withRequestQueryCache,
} from '#lib/db/request-query-cache'

test('deduplicates concurrent reads inside one request', async () => {
  let calls = 0
  const result = await withRequestQueryCache(async () => {
    const load = async () => ++calls
    return Promise.all([
      readRequestQueryCache('same', load),
      readRequestQueryCache('same', load),
    ])
  })

  assert.deepEqual(result, [1, 1])
  assert.equal(calls, 1)
})

test('does not share reads across request scopes', async () => {
  let calls = 0
  const load = async () => ++calls

  const first = await withRequestQueryCache(() =>
    readRequestQueryCache('same', load)
  )
  const second = await withRequestQueryCache(() =>
    readRequestQueryCache('same', load)
  )

  assert.equal(first, 1)
  assert.equal(second, 2)
})

test('does not cache reads outside a request scope', async () => {
  let calls = 0
  const load = async () => ++calls

  assert.equal(await readRequestQueryCache('same', load), 1)
  assert.equal(await readRequestQueryCache('same', load), 2)
})

test('query keys include SQL text and parameter values', () => {
  assert.equal(requestQueryKey('select $1', ['x']), '["select $1",["x"]]')
  assert.notEqual(
    requestQueryKey('select $1', ['x']),
    requestQueryKey('select $1', ['y'])
  )
})
