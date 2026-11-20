import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'pg'
import { query } from '#lib/db/query'

test('overload never admits more than 30 pending database reads', async () => {
  const shared = globalThis as unknown as { _pgPool?: Pool }
  const previous = shared._pgPool
  let waitingCount = 0
  const finish: (() => void)[] = []
  shared._pgPool = {
    get waitingCount() {
      return waitingCount
    },
    query: () =>
      new Promise((resolve) => {
        waitingCount++
        finish.push(() => {
          waitingCount--
          resolve({ rows: [] })
        })
      }),
  } as unknown as Pool
  try {
    const pending = Array.from({ length: 100 }, () => query('SELECT 1'))
    const settled = Promise.allSettled(pending)
    assert.equal(waitingCount, 30)
    for (const resolve of finish) resolve()
    const results = await settled
    assert.equal(results.filter((x) => x.status === 'rejected').length, 70)
    assert.equal(waitingCount, 0)
    const recovered = query('SELECT 1')
    finish.at(-1)!()
    await recovered
  } finally {
    for (const resolve of finish.splice(0)) resolve()
    shared._pgPool = previous
  }
})

test('cursor acquisition observes the same admission limit', async () => {
  const { queryBatches } = await import('#lib/db/query')
  const shared = globalThis as unknown as { _pgPool?: Pool }
  const previous = shared._pgPool
  let connects = 0
  shared._pgPool = {
    waitingCount: 30,
    connect: async () => {
      connects++
      throw new Error('must not connect')
    },
  } as unknown as Pool
  try {
    await assert.rejects(
      queryBatches('SELECT 1', [], 10).next(),
      /wait queue is full/
    )
    assert.equal(connects, 0)
  } finally {
    shared._pgPool = previous
  }
})
