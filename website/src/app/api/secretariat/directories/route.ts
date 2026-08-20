/**
 * @file Lazy Secretariat directory endpoint
 * @description Returns panel payloads only after a reader opens a directory.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { getExplorePanelData } from '@/lib/data/explore-directory-loader'
import { withRequestQueryCache } from '@/lib/db/request-query-cache'
import { parseDirectoryPanel } from '@/lib/directory-request'
import { parseSearchParams } from '@/lib/filter-constants'

export const dynamic = 'force-dynamic'

/** Reads current URL filters and returns one directory panel payload. */
export async function GET(request: NextRequest) {
  const panel = parseDirectoryPanel(request.nextUrl.searchParams.get('panel'))
  if (!panel)
    return NextResponse.json({ error: 'Invalid panel' }, { status: 400 })
  const params = Object.fromEntries(request.nextUrl.searchParams)
  const filters = parseSearchParams(params)
  const data = await withRequestQueryCache(() =>
    getExplorePanelData(filters, panel)
  )
  return NextResponse.json(data)
}
