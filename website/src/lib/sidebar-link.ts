import { mandatePath } from '#lib/seo'

export function sidebarHref(symbol: string, search: string) {
  const params = new URLSearchParams(search)
  const query = params.toString()
  return `/secretariat${query ? `?${query}` : ''}#mandate=${encodeURIComponent(symbol)}`
}
export function sharedSidebarTarget(hash: string, search: string) {
  const symbol = new URLSearchParams(hash.replace(/^#/, '')).get('mandate')
  if (!symbol || symbol.length > 500 || /[\u0000-\u001f]/.test(symbol))
    return null
  if (
    symbol.includes('\\') ||
    symbol
      .split('/')
      .some((segment) => !segment || segment === '.' || segment === '..')
  )
    return null
  const query = new URLSearchParams(search).toString()
  return `${mandatePath(symbol)}${query ? `?${query}` : ''}`
}
