import { NextResponse, type NextRequest } from 'next/server'
import { apiClient } from '@/lib/api-client'
import { createRateLimiter, type RateVerdict } from '@/lib/api-rate-limit'
import { logUnidentifiedClient } from '@/lib/api-refusal-log'
import { refusalResponse } from '@/lib/api-response'
import { limitedRequestKind } from '@/lib/limited-request'
import {
  DOCUMENT_PAGES_PER_DAY,
  DOCUMENT_PAGES_PER_HOUR,
  RATE_LIMIT_PER_DAY,
  RATE_LIMIT_PER_MINUTE,
} from '@/lib/api-limits'

/** Per-client rate limits on the public API and on the document pages. */
const apiLimiter = createRateLimiter({
  window: { ms: 60_000, limit: RATE_LIMIT_PER_MINUTE, rule: 'rate_per_minute' },
  day: { limit: RATE_LIMIT_PER_DAY, rule: 'rate_per_day' },
})
const pageLimiter = createRateLimiter({
  window: {
    ms: 3_600_000,
    limit: DOCUMENT_PAGES_PER_HOUR,
    rule: 'page_per_hour',
  },
  day: { limit: DOCUMENT_PAGES_PER_DAY, rule: 'page_per_day' },
})

const inAbout = (seconds: number) => {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`
  const m = Math.ceil(seconds / 60)
  return `about ${m} minute${m === 1 ? '' : 's'}`
}

function message(verdict: Exclude<RateVerdict, { allowed: true }>): string {
  switch (verdict.rule) {
    case 'rate_per_minute':
      return `Request limit reached. Please try again in ${inAbout(verdict.retryAfterSeconds)}.`
    case 'rate_per_day':
      return 'Daily request limit reached. Please try again after 00:00 UTC.'
    case 'page_per_hour':
      return `Document page limit reached. Please try again in ${inAbout(verdict.retryAfterSeconds)}.`
    case 'page_per_day':
      return 'Daily document page limit reached. Please try again after 00:00 UTC.'
  }
}

export function proxy(request: NextRequest) {
  const route = request.nextUrl.pathname
  const kind = limitedRequestKind(route, request.headers)
  if (kind === 'prefetch') return NextResponse.next()
  const forwardedFor = request.headers.get('x-forwarded-for')
  const client = apiClient(forwardedFor)
  if (client.kind === 'unknown') logUnidentifiedClient(route, forwardedFor)
  const limiter = kind === 'api' ? apiLimiter : pageLimiter
  const verdict = limiter.check(client.bucket, Date.now())
  if (verdict.allowed) return NextResponse.next()
  return refusalResponse(
    request,
    {
      status: 429,
      rule: verdict.rule,
      message: message(verdict),
      values: { limit: verdict.limit },
      retryAfterSeconds: verdict.retryAfterSeconds,
    },
    { html: kind === 'api' ? 'when-navigating' : 'always' }
  )
}

export const config = {
  matcher: ['/api/v1/:path*', '/mandate/:path*'],
}
