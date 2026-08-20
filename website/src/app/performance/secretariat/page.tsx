import { randomUUID } from 'node:crypto'

import { notFound } from 'next/navigation'

import { parseSearchParams } from '@/lib/filter-constants'
import { putPerformanceResult } from '@/lib/perf/result-registry'
import { runSecretariatBenchmark } from '@/lib/perf/secretariat-benchmark'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const dynamic = 'force-dynamic'

const value = (
  params: Record<string, string | string[] | undefined>,
  key: string
): string | undefined => {
  const item = params[key]
  return Array.isArray(item) ? item[0] : item
}

export default async function PerformancePage({ searchParams }: PageProps) {
  if (process.env.ENABLE_PERFORMANCE_BENCHMARK !== '1') notFound()
  const params = await searchParams
  const id = value(params, 'run') ?? randomUUID()
  const result = await runSecretariatBenchmark(parseSearchParams(params), {
    bypassDynamicCache: value(params, 'cache') !== 'on',
    id,
    route: '/secretariat',
  })
  putPerformanceResult(id, result)
  return <p>Performance result ready: {id}</p>
}
