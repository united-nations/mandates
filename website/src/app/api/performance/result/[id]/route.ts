import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { takePerformanceResult } from '@/lib/perf/result-registry'

interface RouteProps {
  params: Promise<{ id: string }>
}

export async function GET(
  _request: NextRequest,
  { params }: RouteProps
): Promise<NextResponse> {
  if (process.env.ENABLE_PERFORMANCE_BENCHMARK !== '1')
    return new NextResponse(null, { status: 404 })
  const result = takePerformanceResult((await params).id)
  if (!result) return new NextResponse(null, { status: 404 })
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
