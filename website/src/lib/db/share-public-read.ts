import { requestQueryKey } from '#lib/db/request-query-cache'
import { isPerformanceTracing } from '#lib/perf/trace-context'

/** Share overlapping executions of one public, request-independent read per process. */
export function sharePublicRead<T>(
  read: (sql: string, params: unknown[]) => Promise<T>
) {
  const pending = new Map<string, Promise<T>>()
  return (sql: string, params: unknown[]): Promise<T> => {
    if (isPerformanceTracing()) return read(sql, params)
    const key = requestQueryKey(sql, params)
    const existing = pending.get(key)
    if (existing) return existing
    const result = read(sql, params).finally(() => pending.delete(key))
    pending.set(key, result)
    return result
  }
}
