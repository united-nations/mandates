import { getBudgetVersions } from '@/lib/data/budget-documents'
import { getAllEntities } from '@/lib/data/entities'
import {
  getExploreCardBaseline,
  getExploreCardData,
  getMandatePageData,
} from '@/lib/data/mandates'
import { getAllOrgans } from '@/lib/data/organs'
import type { FilterOptions } from '@/types'
import {
  buildBenchmarkFailure,
  buildBenchmarkResult,
} from '#lib/perf/benchmark-result'
import { traceSpan, withPerformanceTrace } from '#lib/perf/trace-context'
import type { PerformanceTraceOptions } from '#lib/perf/types'

const measured = <T>(name: string, operation: () => Promise<T>): Promise<T> =>
  traceSpan(name, operation)

const loadSecretariat = async (filters: FilterOptions) => {
  const table = measured('table', () => getMandatePageData(filters))
  const [pageData, versions, entities, organs, cards, cardBaseline] =
    await Promise.all([
      table,
      measured('versions', getBudgetVersions),
      measured('entities', getAllEntities),
      measured('organs', getAllOrgans),
      measured('cards', () => getExploreCardData(filters)),
      measured('card-baseline', () => getExploreCardBaseline(filters)),
    ])
  return { cardBaseline, cards, entities, organs, pageData, versions }
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
