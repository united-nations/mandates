import { queryMany } from '../db/query'
import type { DocumentTextMetrics } from '../text-analytics'
import { textMetricsSql } from './text-metrics-sql'
import { retainedTextSql } from './retained-text-sql'
import {
  applyRetainedMetric,
  type RetainedCache,
} from '../retained-text-metrics'
import retainedCache from '@/data/text-metrics-cache.json'

export async function getDocumentTextMetrics(symbols: string[]) {
  if (!symbols.length) return new Map<string, DocumentTextMetrics>()
  const rows = await queryMany<DocumentTextMetrics & { symbol: string }>(
    textMetricsSql,
    [[...new Set(symbols)]]
  )
  const file = retainedCache as RetainedCache
  const cache =
    file.version === 'retained-dl-v1' &&
    file.text_profile_version === 'substantive-v1' &&
    file.metric_version === 'unicode-word-v1' &&
    file.method_version === 'token-levenshtein-v1'
      ? file.documents
      : {}
  const cachedSymbols = [
    ...new Set(
      rows.flatMap((row) => [
        row.symbol,
        ...(row.previous_document_symbol ? [row.previous_document_symbol] : []),
      ])
    ),
  ].filter((symbol) => cache[symbol])
  const fingerprints = new Map<string, string>()
  if (cachedSymbols.length) {
    const snapshots = await queryMany<{
      symbol: string
      source_fingerprint: string
    }>(retainedTextSql, [cachedSymbols, false])
    for (const snapshot of snapshots)
      fingerprints.set(snapshot.symbol, snapshot.source_fingerprint)
  }
  return new Map(
    rows.map(({ symbol, ...metrics }) => [
      symbol,
      applyRetainedMetric(symbol, metrics, cache, fingerprints),
    ])
  )
}
