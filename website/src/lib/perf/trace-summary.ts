import { createHash } from 'node:crypto'

import type { QuerySummary, QueryTrace } from '#lib/perf/types'

const sum = (values: number[]): number =>
  values.reduce((total, value) => total + value, 0)

const max = (values: number[]): number => Math.max(0, ...values)

const round = (value: number): number => Math.round(value * 1000) / 1000

const maxConcurrent = (queries: QueryTrace[]): number => {
  const events = queries.flatMap((query) => [
    { delta: 1, time: query.startedAtMs },
    { delta: -1, time: query.finishedAtMs },
  ])
  events.sort((a, b) => a.time - b.time || a.delta - b.delta)
  let active = 0
  let peak = 0
  for (const event of events) {
    active += event.delta
    peak = Math.max(peak, active)
  }
  return peak
}

export const normalizeSql = (sql: string): string =>
  sql.replace(/\s+/g, ' ').trim()

export const fingerprintSql = (sql: string): string =>
  createHash('sha256').update(normalizeSql(sql)).digest('hex').slice(0, 12)

export const summarizeQueries = (queries: QueryTrace[]): QuerySummary => ({
  executionMs: round(sum(queries.map((query) => query.executionMs))),
  maxConcurrent: maxConcurrent(queries),
  maxExecutionMs: round(max(queries.map((query) => query.executionMs))),
  maxWaitMs: round(max(queries.map((query) => query.waitMs))),
  queryCount: queries.length,
  totalMs: round(sum(queries.map((query) => query.totalMs))),
  waitMs: round(sum(queries.map((query) => query.waitMs))),
})
