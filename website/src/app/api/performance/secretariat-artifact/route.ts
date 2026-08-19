/** Returns a full Secretariat payload digest for before/after equivalence. */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { withRequestQueryCache } from '@/lib/db/request-query-cache'
import { parseSearchParams } from '@/lib/filter-constants'
import { digestArtifact } from '@/lib/perf/benchmark-result'
import { loadEquivalenceArtifact } from '@/lib/perf/equivalence-loader'

export const dynamic = 'force-dynamic'

/** Builds the full legacy-shaped artifact without changing production data. */
export async function GET(request: NextRequest) {
  if (process.env.ENABLE_PERFORMANCE_BENCHMARK !== '1')
    return new NextResponse(null, { status: 404 })
  const params = Object.fromEntries(request.nextUrl.searchParams)
  const artifact = await withRequestQueryCache(async () =>
    digestArtifact(await loadEquivalenceArtifact(parseSearchParams(params)))
  )
  return NextResponse.json({ artifact })
}
