import { randomUUID } from 'node:crypto'

import { notFound } from 'next/navigation'

import { putPerformanceResult } from '@/lib/perf/result-registry'
import { runMandateBenchmark } from '@/lib/perf/mandate-benchmark'
import { decodeUrlSegments } from '@/lib/utils'

interface PageProps {
  params: Promise<{ segments: string[] }>
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

export default async function PerformanceMandatePage(props: PageProps) {
  if (process.env.ENABLE_PERFORMANCE_BENCHMARK !== '1') notFound()
  const [routeParams, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ])
  const symbol = decodeUrlSegments(routeParams.segments)
  const id = value(searchParams, 'run') ?? randomUUID()
  const result = await runMandateBenchmark(
    symbol,
    value(searchParams, 'ppb_version'),
    { bypassDynamicCache: true, id, route: '/mandate/[symbol]' }
  )
  putPerformanceResult(id, result)
  return <p>Performance result ready: {id}</p>
}
