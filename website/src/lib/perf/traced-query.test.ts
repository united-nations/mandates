import assert from 'node:assert/strict'
import test from 'node:test'

import { queryCaller } from '#lib/perf/traced-query'

test('queryCaller identifies the first data-layer call site', () => {
  const stack = [
    'Error',
    '    at query (src/lib/db/query.ts:12:10)',
    '    at getMandates (src/lib/data/mandates.ts:862:22)',
    '    at render (src/app/secretariat/page.tsx:49:3)',
  ].join('\n')

  assert.equal(queryCaller(stack), 'mandates.ts:862')
})

test('queryCaller reports unknown when no data-layer frame exists', () => {
  assert.equal(
    queryCaller('Error\n at query (src/lib/db/query.ts:12:10)'),
    'unknown'
  )
})

test('queryCaller prefers an explicit SQL trace label', () => {
  assert.equal(
    queryCaller(
      'compiled production stack',
      '/* trace:mandates.list */ select 1'
    ),
    'mandates.list'
  )
})

test('failed traced queries discard the connection instead of reusing it', async () => {
  const failure = new Error('Query read timeout')
  const releases: unknown[] = []
  const pool = {
    connect: async () => ({
      query: async () => {
        throw failure
      },
      release: (error?: unknown) => releases.push(error),
    }),
  } as unknown as import('pg').Pool
  const { tracedPoolQuery } = await import('#lib/perf/traced-query')
  await assert.rejects(tracedPoolQuery(pool, 'SELECT 1'), failure)
  assert.equal(releases.length, 1)
  assert.ok(releases[0], 'a failed client must be destroyed')
})

test('successful traced queries release a reusable connection exactly once', async () => {
  const releases: unknown[] = []
  const result = { rows: [{ id: 1 }], rowCount: 1 }
  const pool = {
    connect: async () => ({
      query: async () => result,
      release: (error?: unknown) => releases.push(error),
    }),
  } as unknown as import('pg').Pool
  const { tracedPoolQuery } = await import('#lib/perf/traced-query')
  assert.equal(await tracedPoolQuery(pool, 'SELECT 1'), result)
  assert.deepEqual(releases, [undefined])
})
