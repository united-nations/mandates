/** Read-only inputs for costing the original paragraph annotation pipeline. */
import { queryBatches, queryMany } from '#lib/db/query'
import {
  mandateMembershipSql,
  versionPredicateSql,
} from '#lib/mandate-membership'

export interface ExtractionBudgetDocument {
  symbol: string
  is_resolution: boolean
  publication_date: string | null
  publication_date_variants: number
  recent_rolling: boolean
  recent_calendar: boolean
  cited_ppb_only: boolean
  cited_version: boolean
  available: boolean
  elements: number
}

export interface ExtractionBudgetElement {
  symbol: string
  position: number
  type: string
  level: number | null
  text: string
}

export const extractionBudgetDocumentsSql = `
WITH registry AS (
  SELECT upper(regexp_replace(d.ppb_full_document_symbol, '\\s', '', 'g')) AS symbol,
    bool_or(coalesce(d.ppb_type = 'Resolutions', false)) AS is_resolution
  FROM public.unified_documents d
  WHERE ${mandateMembershipSql('d', '$1')}
  GROUP BY 1
), citations AS (
  SELECT upper(regexp_replace(c.ppb_full_document_symbol, '\\s', '', 'g')) AS symbol,
    bool_or(EXISTS (
      SELECT 1 FROM ppb2026.budget_documents bd
      JOIN ppb2026.budget_document_versions bv ON bv.doc_slug = bd.slug
      WHERE bv.version_slug = $1 AND bd.doc_type = 'ppb'
        AND c.origin_document ~ bd.match_pattern
    )) AS cited_ppb_only
  FROM ppb2026.source_document_citations c
  JOIN registry r ON r.symbol = upper(regexp_replace(c.ppb_full_document_symbol, '\\s', '', 'g'))
  WHERE ${versionPredicateSql('c', '$1')}
  GROUP BY 1
), available AS (
  SELECT dp.symbol_normalized AS symbol, count(*)::integer AS elements
  FROM digitallibrary.document_paragraphs dp
  JOIN registry r ON r.symbol = dp.symbol_normalized
  JOIN digitallibrary.document_files f
    ON f.symbol_normalized = dp.symbol_normalized AND f.lang = dp.lang
    AND f.status = 'parsed'
  JOIN digitallibrary.document_parses p
    ON p.symbol_normalized = dp.symbol_normalized AND p.lang = dp.lang
  WHERE dp.lang = 'en'
    AND dp.type IN ('paragraph', 'heading', 'title', 'opening', 'table')
  GROUP BY 1
), symbols AS (
  SELECT symbol FROM available UNION SELECT symbol FROM citations
), dates AS (
  SELECT d.symbol_normalized AS symbol, min(d.date_publication) AS publication_date,
    count(DISTINCT d.date_publication)::integer AS publication_date_variants
  FROM digitallibrary.documents d JOIN symbols s ON s.symbol = d.symbol_normalized
  GROUP BY 1
)
SELECT s.symbol, r.is_resolution, d.publication_date::text,
  coalesce(d.publication_date_variants, 0) AS publication_date_variants,
  coalesce(d.publication_date BETWEEN $2::date AND $4::date, false) AS recent_rolling,
  coalesce(d.publication_date BETWEEN $3::date AND $4::date, false) AS recent_calendar,
  coalesce(c.cited_ppb_only, false) AS cited_ppb_only,
  (c.symbol IS NOT NULL) AS cited_version,
  (a.symbol IS NOT NULL) AS available, coalesce(a.elements, 0) AS elements
FROM symbols s JOIN registry r USING (symbol) LEFT JOIN dates d USING (symbol)
LEFT JOIN citations c USING (symbol) LEFT JOIN available a USING (symbol)
ORDER BY s.symbol
`

export function getExtractionBudgetDocuments(
  version: string,
  rollingStart: string,
  calendarStart: string,
  asOf: string
): Promise<ExtractionBudgetDocument[]> {
  return queryMany(extractionBudgetDocumentsSql, [
    version,
    rollingStart,
    calendarStart,
    asOf,
  ])
}

export const extractionBudgetElementsSql = `
SELECT dp.symbol_normalized AS symbol, dp.position, dp.type, dp.level, dp.text
FROM digitallibrary.document_paragraphs dp
JOIN digitallibrary.document_files f
  ON f.symbol_normalized = dp.symbol_normalized AND f.lang = dp.lang
  AND f.status = 'parsed'
JOIN digitallibrary.document_parses p
  ON p.symbol_normalized = dp.symbol_normalized AND p.lang = dp.lang
WHERE dp.symbol_normalized = ANY($1::text[]) AND dp.lang = 'en'
  AND dp.type IN ('paragraph', 'heading', 'title', 'opening', 'table')
ORDER BY dp.symbol_normalized, dp.position
`

export function getExtractionBudgetElements(symbols: string[]) {
  return queryBatches<ExtractionBudgetElement>(
    extractionBudgetElementsSql,
    [symbols],
    3000
  )
}
