import type { BenchmarkResult } from '#lib/perf/benchmark-result'

const MAX_RESULTS = 50

interface PerformanceGlobal {
  _performanceResults?: Map<string, BenchmarkResult>
}

const performanceGlobal = globalThis as PerformanceGlobal

const results = (): Map<string, BenchmarkResult> => {
  performanceGlobal._performanceResults ??= new Map()
  return performanceGlobal._performanceResults
}

const trim = (entries: Map<string, BenchmarkResult>): void => {
  while (entries.size > MAX_RESULTS) {
    const oldest = entries.keys().next().value
    if (oldest === undefined) return
    entries.delete(oldest)
  }
}

export const putPerformanceResult = (
  id: string,
  result: BenchmarkResult
): void => {
  const entries = results()
  entries.set(id, result)
  trim(entries)
}

export const takePerformanceResult = (
  id: string
): BenchmarkResult | undefined => {
  const result = results().get(id)
  results().delete(id)
  return result
}
