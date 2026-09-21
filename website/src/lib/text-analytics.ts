/** Eligibility is established server-side, before values reach either view. */
export interface DocumentTextMetrics {
  word_count: number | null
  similarity_to_previous: number | null
  previous_document_symbol: string | null
  can_compare: boolean
  comparison_unavailable_reason?:
    'not_in_series' | 'first' | 'ambiguous_order' | 'collection' | 'ordered'
}

export function formatWordCount(value: number | null | undefined): string {
  return value == null ? '—' : new Intl.NumberFormat('en-US').format(value)
}

export function formatSimilarity(
  value: number | null | undefined
): string | null {
  return value == null || !Number.isFinite(value) || value < 0 || value > 1
    ? null
    : `${Math.round(value * 100)}%`
}

export function comparisonUrl(
  symbol: string,
  metrics?: DocumentTextMetrics
): string | null {
  if (!metrics?.can_compare || !metrics.previous_document_symbol) return null
  const params = new URLSearchParams({
    symbol1: metrics.previous_document_symbol,
    symbol2: symbol,
  })
  return `https://diff.un-two-zero.dev/?${params}`
}
