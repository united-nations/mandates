/**
 * @file Lazy Secretariat directory endpoint
 * @description Returns panel payloads only after a reader opens a directory.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { getExploreDirectoryData } from '@/lib/data/explore-directory-loader'
import { withRequestQueryCache } from '@/lib/db/request-query-cache'
import { parseSearchParams } from '@/lib/filter-constants'

export const dynamic = 'force-dynamic'

/** Reads current URL filters and returns all directory panel data. */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams)
  const filters = parseSearchParams(params)
  const data = await withRequestQueryCache(() =>
    getExploreDirectoryData(filters)
  )
  return NextResponse.json(data)
}
