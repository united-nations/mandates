export interface PoolSnapshot {
  idle: number
  total: number
  waiting: number
}

export interface QueryTrace {
  caller: string
  error?: string
  executionMs: number
  fingerprint: string
  finishedAtMs: number
  params: unknown[]
  pool: PoolSnapshot
  rowCount: number | null
  sql: string
  startedAtMs: number
  totalMs: number
  waitMs: number
}

export interface PerformanceSpan {
  finishedAtMs: number
  name: string
  startedAtMs: number
  totalMs: number
}

export interface PerformanceTrace {
  bypassDynamicCache: boolean
  durationMs: number
  id: string
  queries: QueryTrace[]
  route: string
  spans: PerformanceSpan[]
  startedAtEpochMs: number
}

export interface PerformanceTraceOptions {
  bypassDynamicCache: boolean
  id: string
  route: string
}

export interface QuerySummary {
  executionMs: number
  maxConcurrent: number
  maxExecutionMs: number
  maxWaitMs: number
  queryCount: number
  totalMs: number
  waitMs: number
}
