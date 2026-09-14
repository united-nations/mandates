import type { DocumentTextMetrics } from './text-analytics'

export interface RetainedCache {
  version: string
  text_profile_version?: string
  metric_version?: string
  method_version?: string
  documents: Record<string, RetainedMetric>
}

export interface RetainedMetric {
  source_fingerprint: string
  content_sha256: string
  word_count: number
  previous_document_symbol: string | null
  previous_content_sha256: string | null
  similarity_to_previous: number | null
}

/** Cache values remain provisional even after internal text accounting passes. */
export function applyRetainedMetric(
  symbol: string,
  current: DocumentTextMetrics,
  cache: Record<string, RetainedMetric>,
  fingerprints: Map<string, string>
): DocumentTextMetrics {
  const saved = cache[symbol]
  if (
    !saved ||
    fingerprints.get(symbol) !== saved.source_fingerprint ||
    !Number.isInteger(saved.word_count) ||
    saved.word_count < 0
  )
    return current
  const result = { ...current }
  if (result.word_count == null) {
    result.word_count = saved.word_count
    result.provisional = true
  }
  const previousSymbol = current.previous_document_symbol
  const previous = previousSymbol ? cache[previousSymbol] : undefined
  if (
    current.comparison_unavailable_reason === 'ordered' &&
    previousSymbol &&
    previous &&
    fingerprints.get(previousSymbol) === previous.source_fingerprint &&
    saved.previous_document_symbol === previousSymbol &&
    saved.previous_content_sha256 === previous.content_sha256 &&
    saved.similarity_to_previous != null &&
    Number.isFinite(saved.similarity_to_previous) &&
    saved.similarity_to_previous >= 0 &&
    saved.similarity_to_previous <= 1 &&
    result.similarity_to_previous == null
  ) {
    result.similarity_to_previous = saved.similarity_to_previous
    result.can_compare = true
    result.provisional = true
  }
  return result
}
