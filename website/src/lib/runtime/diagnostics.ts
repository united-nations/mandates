import { getHeapStatistics } from 'node:v8'
import type { Pool } from 'pg'
import { takeAdmissionRejections } from '#lib/db/query-admission'
import { createRuntimeSampler } from '#lib/runtime/diagnostics-sampler'

interface RuntimeGlobal {
  _pgPool?: Pool
  _runtimeDiagnosticsStop?: () => void
}
const runtime = globalThis as RuntimeGlobal

function memorySnapshot() {
  return {
    ...process.memoryUsage(),
    heapLimit: getHeapStatistics().heap_size_limit,
  }
}

function poolSnapshot() {
  const pool = runtime._pgPool
  return pool
    ? {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      }
    : { total: 0, idle: 0, waiting: 0 }
}

function emitSample(sampler: ReturnType<typeof createRuntimeSampler>) {
  // Structured informational telemetry is intentionally written to stdout.
  // eslint-disable-next-line no-console
  console.info(
    JSON.stringify({
      event: 'runtime-health',
      timestamp: new Date().toISOString(),
      pid: process.pid,
      uptimeSeconds: process.uptime(),
      memory: memorySnapshot(),
      pool: poolSnapshot(),
      databaseAdmissionRejections: takeAdmissionRejections(),
      ...sampler.sample(),
    })
  )
}

function createDiagnostics(intervalMs: number): () => void {
  const sampler = createRuntimeSampler()
  const timer = setInterval(() => emitSample(sampler), intervalMs)
  timer.unref()
  let stopped = false
  const stop = () => {
    if (stopped) return
    stopped = true
    clearInterval(timer)
    sampler.stop()
    if (runtime._runtimeDiagnosticsStop === stop)
      delete runtime._runtimeDiagnosticsStop
  }
  return stop
}

/** Numeric, constant-space summaries only: no requests, SQL, or result payloads. */
export function startRuntimeDiagnostics(intervalMs = 30_000): () => void {
  if (
    !Number.isSafeInteger(intervalMs) ||
    intervalMs < 100 ||
    intervalMs > 2_147_483_647
  )
    throw new Error('Invalid diagnostics interval')
  runtime._runtimeDiagnosticsStop ??= createDiagnostics(intervalMs)
  return runtime._runtimeDiagnosticsStop
}
