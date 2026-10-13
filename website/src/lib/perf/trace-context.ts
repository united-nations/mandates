import { AsyncLocalStorage } from 'node:async_hooks'

import { withRequestQueryCache } from '#lib/db/request-query-cache'

import type {
  PerformanceSpan,
  PerformanceTrace,
  PerformanceTraceOptions,
  QueryTrace,
} from '#lib/perf/types'

interface TraceStore {
  activeQueries: number
  idleResolvers: Set<() => void>
  startedAt: number
  trace: PerformanceTrace
}

const storage = new AsyncLocalStorage<TraceStore>()
const elapsed = (startedAt: number) => performance.now() - startedAt

const createStore = (options: PerformanceTraceOptions): TraceStore => ({
  activeQueries: 0,
  idleResolvers: new Set(),
  startedAt: performance.now(),
  trace: {
    ...options,
    durationMs: 0,
    queries: [],
    spans: [],
    startedAtEpochMs: Date.now(),
  },
})

const waitForQueries = async (store: TraceStore): Promise<void> => {
  if (store.activeQueries === 0) return
  await new Promise<void>((resolve) => store.idleResolvers.add(resolve))
}

const queryFinished = (store: TraceStore): void => {
  store.activeQueries -= 1
  if (store.activeQueries !== 0) return
  for (const resolve of store.idleResolvers) resolve()
  store.idleResolvers.clear()
}

export async function withPerformanceTrace<T>(
  options: PerformanceTraceOptions,
  operation: () => Promise<T>
): Promise<
  | { error: string; trace: PerformanceTrace; value?: undefined }
  | { error?: undefined; trace: PerformanceTrace; value: T }
> {
  const store = createStore(options)
  return storage.run(store, () =>
    withRequestQueryCache(async () => {
      try {
        const value = await operation()
        await waitForQueries(store)
        store.trace.durationMs = elapsed(store.startedAt)
        return { trace: store.trace, value }
      } catch (error) {
        await waitForQueries(store)
        store.trace.durationMs = elapsed(store.startedAt)
        return {
          error: error instanceof Error ? error.message : String(error),
          trace: store.trace,
        }
      }
    })
  )
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

export const trackPerformanceQuery = <T>(
  operation: () => Promise<T>
): Promise<T> => {
  const store = storage.getStore()
  if (!store) return operation()
  store.activeQueries += 1
  return operation().finally(() => queryFinished(store))
}
