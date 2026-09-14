'use client'

import { GitCompare } from 'lucide-react'
import {
  comparisonUrl,
  formatSimilarity,
  formatWordCount,
  type DocumentTextMetrics,
} from '@/lib/text-analytics'

export function WordCount({ metrics }: { metrics?: DocumentTextMetrics }) {
  return (
    <span
      className="whitespace-nowrap tabular-nums"
      aria-label={metrics?.word_count == null ? 'Word length unavailable' : undefined}
      title={
        metrics?.word_count == null
          ? 'Word length unavailable'
          : 'Words in the substantive English text, including annexes'
      }
    >
      {formatWordCount(metrics?.word_count)}
    </span>
  )
}

export function TextSimilarity({
  symbol,
  metrics,
}: {
  symbol: string
  metrics?: DocumentTextMetrics
}) {
  const href = comparisonUrl(symbol, metrics)
  const score = href ? formatSimilarity(metrics?.similarity_to_previous) : null
  if (!href)
    return (
      <span
        title="Text similarity unavailable"
        aria-label="Text similarity unavailable"
      >
        —
      </span>
    )
  const label = `Compare ${symbol} with ${metrics?.previous_document_symbol}${score ? `; text similarity ${score}` : '; similarity unavailable'} (opens in a new tab)`
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      aria-label={label}
      title={label}
      className="inline-flex items-center gap-1.5 rounded border border-gray-200 px-2 py-1 text-xs font-medium whitespace-nowrap text-gray-600 tabular-nums hover:border-un-blue hover:text-un-blue focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none"
    >
      <GitCompare aria-hidden className="h-3.5 w-3.5" />
      {score ?? 'Compare'}
    </a>
  )
}
