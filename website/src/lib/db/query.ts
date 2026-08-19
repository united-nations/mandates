/**
 * Database Query Helpers
 */

import { QueryResult, QueryResultRow } from 'pg'
import { getPool } from './index'
import { isPerformanceTracing } from '#lib/perf/trace-context'
import { tracedPoolQuery } from '#lib/perf/traced-query'

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const pool = getPool()
  if (isPerformanceTracing()) return tracedPoolQuery<T>(pool, text, params)
  return pool.query<T>(text, params)
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
