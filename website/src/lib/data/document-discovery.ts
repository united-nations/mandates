import { cache } from 'react'
import { queryMany, queryOne } from '../db/query'
import { getHistoricalDocument } from './historical-document'
export const getDocumentDiscovery = cache(async (symbol: string) => {
  const row = await queryOne<{ symbol: string; title: string; body: string | null; year: number | null }>(`
    SELECT ppb_full_document_symbol AS symbol,
      COALESCE(NULLIF(display_title, ''), NULLIF(ppb_description, ''), ppb_full_document_symbol) AS title,
      ppb_body AS body, ppb_year AS year
    FROM public.unified_documents WHERE ppb_full_document_symbol = $1`, [symbol])
  if (row) return row
  const historical = await getHistoricalDocument(symbol)
  return historical ? { symbol, title: historical.display_title || historical.ppb_description || symbol,
    body: historical.ppb_body, year: historical.ppb_year } : null
})
const sitemapUniverse = `SELECT DISTINCT ppb_full_document_symbol AS symbol
  FROM public.unified_documents d
  WHERE d.is_catalog_pattern OR EXISTS (
    SELECT 1 FROM ppb2026.source_document_citations c
    WHERE c.ppb_full_document_symbol = d.ppb_full_document_symbol)`
export async function getSitemapCount() {
  const row = await queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM (${sitemapUniverse}) docs`)
  return Number(row?.count ?? 0)
}
export function getSitemapSymbols(offset: number, limit: number) {
  return queryMany<{ symbol: string }>(`${sitemapUniverse} ORDER BY symbol LIMIT $1 OFFSET $2`, [limit, offset])
}
