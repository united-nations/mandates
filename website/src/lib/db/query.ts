/**
 * Database Query Helpers
 */

import type { QueryResult, QueryResultRow } from 'pg'
import { getPool } from '#lib/db/index'
import {
  readRequestQueryCache,
  requestQueryKey,
} from '#lib/db/request-query-cache'
import { isPerformanceTracing } from '#lib/perf/trace-context'
import { tracedPoolQuery } from '#lib/perf/traced-query'

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return readRequestQueryCache(requestQueryKey(text, params), () => {
    const pool = getPool()
    if (isPerformanceTracing()) return tracedPoolQuery<T>(pool, text, params)
    return pool.query<T>(text, params)
  })
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await query<T>(text, params)
  return result.rows[0] || null
}

export async function queryMany<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await query<T>(text, params)
  return result.rows
}

/** Read one ordered query in bounded batches using the shared pool.
 * The transaction keeps the cursor on one PgBouncer connection. Returning early
 * or aborting destroys that connection, so no open transaction can reach the pool.
 */
export async function* queryBatches<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[],
  batchSize: number,
  signal?: AbortSignal
): AsyncGenerator<T[]> {
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 10_000)
    throw new Error('Invalid query batch size')
  signal?.throwIfAborted()
  const client = await getPool().connect()
  let released = false
  let committed = false
  const release = (destroy: boolean) => {
    if (released) return
    released = true
    client.release(destroy)
  }
  const abort = () => release(true)
  signal?.addEventListener('abort', abort, { once: true })
  try {
    signal?.throwIfAborted()
    await client.query('BEGIN READ ONLY')
    await client.query(
      `DECLARE export_rows NO SCROLL CURSOR FOR ${text}`,
      params
    )
    while (true) {
      signal?.throwIfAborted()
      // batchSize is a validated internal integer, never request text.
      const result = await client.query<T>(
        `FETCH FORWARD ${batchSize} FROM export_rows`
      )
      signal?.throwIfAborted()
      if (!result.rows.length) break
      yield result.rows
      if (result.rows.length < batchSize) break
    }
    await client.query('COMMIT')
    committed = true
  } finally {
    signal?.removeEventListener('abort', abort)
    release(!committed)
  }
}
