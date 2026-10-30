import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Pool } from 'pg'
import { queryBatches } from '#lib/db/query'

class CursorClient {
  calls: { text: string; params?: unknown[] }[] = []
  releases: boolean[] = []
  batches = [[{ id: 1 }, { id: 2 }], [{ id: 3 }]]
  failFetch = false
  async query(text: string, params?: unknown[]) {
    this.calls.push({ text, params })
    if (text.startsWith('FETCH')) {
      if (this.failFetch) throw new Error('Fetch failed')
      return { rows: this.batches.shift() ?? [] }
    }
    return { rows: [] }
  }
  release(destroy: boolean) {
    this.releases.push(destroy)
  }
}

async function usingClient(client: CursorClient, run: () => Promise<void>) {
  const shared = globalThis as unknown as { _pgPool?: Pool }
  const previous = shared._pgPool
  shared._pgPool = { connect: async () => client } as unknown as Pool
  try {
    await run()
  } finally {
    shared._pgPool = previous
  }
}

test('cursor reads one parameterized query, commits and returns its pool slot', async () => {
  const client = new CursorClient()
  await usingClient(client, async () => {
    const rows = []
    for await (const batch of queryBatches('SELECT $1 AS id', [7], 2))
      rows.push(...batch)
    assert.deepEqual(rows, [{ id: 1 }, { id: 2 }, { id: 3 }])
    assert.equal(
      client.calls.filter((call) => call.text.startsWith('DECLARE')).length,
      1
    )
    assert.deepEqual(
      client.calls.find((call) => call.text.startsWith('DECLARE'))?.params,
      [7]
    )
    assert.equal(client.calls.at(-1)?.text, 'COMMIT')
    assert.deepEqual(client.releases, [false])
  })
})

test('consumer early return destroys the cursor connection without returning an open transaction', async () => {
  const client = new CursorClient()
  await usingClient(client, async () => {
    for await (const batch of queryBatches('SELECT 1', [], 2)) {
      assert.equal(batch.length, 2)
      break
    }
    assert.ok(!client.calls.some((call) => call.text === 'COMMIT'))
    assert.deepEqual(client.releases, [true])
  })
})

test('query errors destroy and release the cursor connection once', async () => {
  const client = new CursorClient()
  client.failFetch = true
  await usingClient(client, async () => {
    await assert.rejects(queryBatches('SELECT 1', [], 2).next(), /Fetch failed/)
    assert.deepEqual(client.releases, [true])
  })
})

test('abort while the consumer processes a batch immediately releases the connection', async () => {
  const client = new CursorClient()
  await usingClient(client, async () => {
    const controller = new AbortController()
    const iterator = queryBatches('SELECT 1', [], 2, controller.signal)
    await iterator.next()
    controller.abort()
    assert.deepEqual(client.releases, [true])
    await assert.rejects(iterator.next(), { name: 'AbortError' })
    assert.deepEqual(client.releases, [true])
  })
})

test('abort during FETCH interrupts the outstanding query and releases only once', async () => {
  class BlockedClient extends CursorClient {
    onFetch: () => void = () => {}
    rejectFetch?: (error: Error) => void
    override async query(text: string, params?: unknown[]) {
      if (!text.startsWith('FETCH')) return super.query(text, params)
      this.onFetch()
      return new Promise<{ rows: { id: number }[] }>((_, reject) => {
        this.rejectFetch = reject
      })
    }
    override release(destroy: boolean) {
      super.release(destroy)
      if (destroy) this.rejectFetch?.(new Error('Connection closed'))
    }
  }
  const client = new BlockedClient()
  await usingClient(client, async () => {
    const controller = new AbortController()
    const started = new Promise<void>((resolve) => {
      client.onFetch = resolve
    })
    const next = queryBatches('SELECT 1', [], 2, controller.signal).next()
    await started
    controller.abort()
    await assert.rejects(next, /Connection closed/)
    assert.deepEqual(client.releases, [true])
  })
})

test('already aborted requests never acquire a connection', async () => {
  const client = new CursorClient()
  await usingClient(client, async () => {
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(
      queryBatches('SELECT 1', [], 2, controller.signal).next(),
      { name: 'AbortError' }
    )
    assert.deepEqual(client.calls, [])
    assert.deepEqual(client.releases, [])
  })
})
