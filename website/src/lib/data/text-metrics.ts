import { queryMany } from '../db/query'
import type { DocumentTextMetrics } from '../text-analytics'
import { textMetricsSql } from './text-metrics-sql'

export async function getDocumentTextMetrics(symbols: string[]) {
  if (!symbols.length) return new Map<string, DocumentTextMetrics>()
  const rows = await queryMany<DocumentTextMetrics & { symbol: string }>(
    textMetricsSql,
    [[...new Set(symbols)]]
  )
  return new Map(rows.map(({ symbol, ...metrics }) => [symbol, metrics]))
}
