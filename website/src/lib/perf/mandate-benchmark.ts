import { getAllEntities } from '@/lib/data/entities'
import { getMandateBySymbol, getResolutionSeries } from '@/lib/data/mandates'
import { getAllOrgans } from '@/lib/data/organs'
import { getParagraphsBySymbol } from '@/lib/data/paragraphs'
import { getMandatedSgReports } from '@/lib/data/mandated-sg-reports'
import { allSettledOrThrow } from '#lib/perf/all-settled'
import {
  buildBenchmarkFailure,
  buildBenchmarkResult,
} from '#lib/perf/benchmark-result'
import { traceSpan, withPerformanceTrace } from '#lib/perf/trace-context'
import type { PerformanceTraceOptions } from '#lib/perf/types'

const measured = <T>(name: string, operation: () => Promise<T>): Promise<T> =>
  traceSpan(name, operation)

const loadMandate = async (symbol: string, version?: string) => {
  const [mandate, entities, organs, paragraphs, series, reports] =
    await allSettledOrThrow([
      measured('mandate', () => getMandateBySymbol(symbol, version)),
      measured('entities', getAllEntities),
      measured('organs', getAllOrgans),
      measured('paragraphs', () => getParagraphsBySymbol(symbol)),
      measured('series', () => getResolutionSeries(symbol)),
      measured('sg-reports', () => getMandatedSgReports(symbol)),
    ] as const)
  return { entities, mandate, organs, paragraphs, reports, series }
}

export const runMandateBenchmark = async (
  symbol: string,
  version: string | undefined,
  options: PerformanceTraceOptions
) => {
  const result = await withPerformanceTrace(options, () =>
    loadMandate(symbol, version)
  )
  if (result.error !== undefined)
    return buildBenchmarkFailure(result.trace, result.error)
  return buildBenchmarkResult(result.trace, result.value)
}
