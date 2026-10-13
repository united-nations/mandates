import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg'

import {
  performanceTraceElapsed,
  recordQueryTrace,
  trackPerformanceQuery,
} from '#lib/perf/trace-context'
import { fingerprintSql } from '#lib/perf/trace-summary'
import type { PoolSnapshot, QueryTrace } from '#lib/perf/types'

interface QueryTiming {
  caller: string
  params?: unknown[]
  pool: PoolSnapshot
  startedAtMs: number
  text: string
  wallStartedAt: number
}

const poolSnapshot = (pool: Pool): PoolSnapshot => ({
  idle: pool.idleCount,
  total: pool.totalCount,
  waiting: pool.waitingCount,
})

export const queryCaller = (stack = '', sql = ''): string => {
  const label = sql.match(/\/\*\s*trace:([a-z0-9.-]+)\s*\*\//i)?.[1]
  if (label) return label
  const frame = stack.split('\n').find((line) => line.includes('src/lib/data/'))
  const match = frame?.match(/src\/lib\/data\/([^:)]+\.ts):(\d+)/)
  return match ? `${match[1]}:${match[2]}` : 'unknown'
}

const startTiming = (
  pool: Pool,
  text: string,
  params?: unknown[]
): QueryTiming => ({
  caller: queryCaller(new Error().stack, text),
  params,
  pool: poolSnapshot(pool),
  startedAtMs: performanceTraceElapsed() ?? 0,
  text,
  wallStartedAt: performance.now(),
})

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const finishTrace = (
  timing: QueryTiming,
  details: Pick<QueryTrace, 'executionMs' | 'rowCount' | 'waitMs' | 'error'>
): void => {
  const finishedAtMs = performanceTraceElapsed() ?? timing.startedAtMs
  recordQueryTrace({
    ...details,
    caller: timing.caller,
    fingerprint: fingerprintSql(timing.text),
    finishedAtMs,
    params: timing.params ?? [],
    pool: timing.pool,
    sql: timing.text,
    startedAtMs: timing.startedAtMs,
    totalMs: performance.now() - timing.wallStartedAt,
  })
}

const connect = async (
  pool: Pool,
  timing: QueryTiming
): Promise<PoolClient> => {
  try {
    return await pool.connect()
  } catch (error) {
    finishTrace(timing, {
      error: errorMessage(error),
      executionMs: 0,
      rowCount: null,
      waitMs: performance.now() - timing.wallStartedAt,
    })
    throw error
  }
}

const execute = async <T extends QueryResultRow>(
  client: PoolClient,
  timing: QueryTiming
): Promise<QueryResult<T>> => {
  const waitMs = performance.now() - timing.wallStartedAt
  const executionStartedAt = performance.now()
  try {
    const result = await client.query<T>(timing.text, timing.params)
    finishTrace(timing, {
      executionMs: performance.now() - executionStartedAt,
      rowCount: result.rowCount,
      waitMs,
    })
    return result
  } catch (error) {
    finishTrace(timing, {
      error: errorMessage(error),
      executionMs: performance.now() - executionStartedAt,
      rowCount: null,
      waitMs,
    })
    throw error
  }
}

export async function tracedPoolQuery<T extends QueryResultRow>(
  pool: Pool,
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return trackPerformanceQuery(async () => {
    const timing = startTiming(pool, text, params)
    const client = await connect(pool, timing)
    try {
      return await execute<T>(client, timing)
    } finally {
      client.release()
    }
  })
}
