/** Which rate limit, if any, a request handled by the proxy counts against. */
export type LimitedRequestKind = 'api' | 'document_page' | 'prefetch'

export function limitedRequestKind(
  pathname: string,
  headers: { get(name: string): string | null }
): LimitedRequestKind {
  if (pathname.startsWith('/api/v1') || pathname.endsWith('.json')) return 'api'
  if (headers.get('rsc') === '1' && headers.get('next-router-prefetch') === '1')
    return 'prefetch'
  return 'document_page'
}
