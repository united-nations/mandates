import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import { Pool, type PoolConfig } from 'pg'
import { query } from '#lib/db/query'
import { takeAdmissionRejections } from '#lib/db/query-admission'

/** Exercise pg-pool's real queue without opening a network connection. */
class OfflineClient extends EventEmitter {
  _queryable = true
  connect(callback: (error: null) => void) {
    queueMicrotask(() => callback(null))
  }
  query(
    _text: string,
    _params: unknown[],
    callback: (error: null, result: unknown) => void
  ) {
    queueMicrotask(() => callback(null, { rows: [{ id: 1 }], rowCount: 1 }))
  }
  end() {
    this.emit('end')
  }
}

test('real pg queue remains bounded and serves new work after saturation drains', async () => {
  const config = {
    max: 1,
    idleTimeoutMillis: 0,
    Client: OfflineClient as unknown as PoolConfig['Client'],
  }
  const pool = new Pool(config)
  const shared = globalThis as unknown as { _pgPool?: Pool }
  const previous = shared._pgPool
  shared._pgPool = pool
  const held = await pool.connect()
  takeAdmissionRejections()
  try {
    const work = Promise.allSettled(
      Array.from({ length: 100 }, () => query('SELECT 1'))
    )
    assert.equal(pool.waitingCount, 30)
    held.release()
    const results = await work
    assert.equal(results.filter((x) => x.status === 'fulfilled').length, 30)
    assert.equal(results.filter((x) => x.status === 'rejected').length, 70)
    assert.equal(takeAdmissionRejections(), 70)
    assert.equal(pool.waitingCount, 0)
    assert.deepEqual((await query('SELECT 1')).rows, [{ id: 1 }])
  } finally {
    shared._pgPool = previous
    await pool.end()
  }
})
