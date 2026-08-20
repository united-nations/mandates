import { createHash } from 'node:crypto'

import { summarizeQueries } from '#lib/perf/trace-summary'
import type { PerformanceTrace, QuerySummary } from '#lib/perf/types'

export interface ArtifactDigest {
  bytes: number
  digest: string
}

export interface BenchmarkResult {
  artifact?: ArtifactDigest
  error?: string
  querySummary: QuerySummary
  trace: PerformanceTrace
}

export const digestArtifact = (value: unknown): ArtifactDigest => {
  const serialized = JSON.stringify(value)
  return {
    bytes: Buffer.byteLength(serialized),
    digest: createHash('sha256').update(serialized).digest('hex'),
  }
}

export const buildBenchmarkResult = (
  trace: PerformanceTrace,
  value: unknown
): BenchmarkResult => ({
  artifact: digestArtifact(value),
  querySummary: summarizeQueries(trace.queries),
  trace,
})

export const buildBenchmarkFailure = (
  trace: PerformanceTrace,
  error: string
): BenchmarkResult => ({
  error,
  querySummary: summarizeQueries(trace.queries),
  trace,
})
