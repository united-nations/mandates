import { AsyncLocalStorage } from 'node:async_hooks'

import type {
  PerformanceSpan,
  PerformanceTrace,
  PerformanceTraceOptions,
  QueryTrace,
} from '#lib/perf/types'

interface TraceStore {
  startedAt: number
  trace: PerformanceTrace
}

const storage = new AsyncLocalStorage<TraceStore>()
const elapsed = (startedAt: number) => performance.now() - startedAt

const createStore = (options: PerformanceTraceOptions): TraceStore => ({
  startedAt: performance.now(),
  trace: {
    ...options,
    durationMs: 0,
    queries: [],
    spans: [],
    startedAtEpochMs: Date.now(),
  },
})

export async function withPerformanceTrace<T>(
  options: PerformanceTraceOptions,
  operation: () => Promise<T>
): Promise<{ trace: PerformanceTrace; value: T }> {
  const store = createStore(options)
  return storage.run(store, async () => {
    const value = await operation()
    store.trace.durationMs = elapsed(store.startedAt)
    return { trace: store.trace, value }
  })
}

export async function traceSpan<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const store = storage.getStore()
  if (!store) return operation()
  const startedAtMs = elapsed(store.startedAt)
  try {
    return await operation()
  } finally {
    store.trace.spans.push(buildSpan(name, startedAtMs, store.startedAt))
  }
}

const buildSpan = (
  name: string,
  startedAtMs: number,
  traceStartedAt: number
): PerformanceSpan => {
  const finishedAtMs = elapsed(traceStartedAt)
  return {
    name,
    startedAtMs,
    finishedAtMs,
    totalMs: finishedAtMs - startedAtMs,
  }
}

export const isDynamicCacheBypassed = (): boolean =>
  storage.getStore()?.trace.bypassDynamicCache ?? false

export const performanceTraceElapsed = (): number | null => {
  const store = storage.getStore()
  return store ? elapsed(store.startedAt) : null
}

export const recordQueryTrace = (query: QueryTrace): void => {
  storage.getStore()?.trace.queries.push(query)
}

export const isPerformanceTracing = (): boolean =>
  storage.getStore() !== undefined
