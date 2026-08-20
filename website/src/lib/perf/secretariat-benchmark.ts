import { getBudgetVersions } from '@/lib/data/budget-documents'
import { getAllEntities } from '@/lib/data/entities'
import {
  getExploreCardBaselineFigures,
  getExploreCardFigures,
} from '@/lib/data/explore-card-figure-loader'
import {
  getExploreCardRegistryCount,
  getMandatePageData,
} from '@/lib/data/mandates'
import { getAllOrgans } from '@/lib/data/organs'
import type { FilterOptions } from '@/types'
import { allSettledOrThrow } from '#lib/perf/all-settled'
import {
  buildBenchmarkFailure,
  buildBenchmarkResult,
} from '#lib/perf/benchmark-result'
import { traceSpan, withPerformanceTrace } from '#lib/perf/trace-context'
import type { PerformanceTraceOptions } from '#lib/perf/types'

const measured = <T>(name: string, operation: () => Promise<T>): Promise<T> =>
  traceSpan(name, operation)

const secretariatTasks = (filters: FilterOptions) =>
  [
    measured('table', () => getMandatePageData(filters)),
    measured('versions', getBudgetVersions),
    measured('entities', getAllEntities),
    measured('organs', getAllOrgans),
    measured('cards', () => getExploreCardFigures(filters)),
    measured('card-baseline', () => getExploreCardBaselineFigures(filters)),
    measured('card-registry', () => getExploreCardRegistryCount(filters)),
  ] as const

const loadSecretariat = async (filters: FilterOptions) => {
  const [
    pageData,
    versions,
    entities,
    organs,
    cards,
    cardBaseline,
    registryCount,
  ] = await allSettledOrThrow(secretariatTasks(filters))
  return {
    cardBaseline,
    cards,
    entities,
    organs,
    pageData,
    registryCount,
    versions,
  }
}

export const runSecretariatBenchmark = async (
  filters: FilterOptions,
  options: PerformanceTraceOptions
) => {
  const result = await withPerformanceTrace(options, () =>
    loadSecretariat(filters)
  )
  if (result.error !== undefined)
    return buildBenchmarkFailure(result.trace, result.error)
  return buildBenchmarkResult(result.trace, result.value)
}
