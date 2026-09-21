import { queryMany } from '../db/query'

interface HistoricalDocumentRow {
  ppb_full_document_symbol: string
  ppb_link: string | null
  ppb_year: number | null
  ppb_body: string | null
  ppb_description: string | null
  display_title: string | null
  ppb_type: string | null
  subjects: string[] | null
  agenda_items: { doc: string | null; item: string | null; desc: string | null; topic: string | null }[] | null
  num_entities: string
  num_citations: string
  entities: string[]
}
/** Historical routes must refer to a real member of a registry-visible series. */
const historicalDocumentSql = `
  WITH member AS (
    SELECT DISTINCT rs.recid, rs.document_symbol, rs.un_body, rs.doc_type
    FROM digitallibrary.resolution_series rs
    WHERE rs.document_symbol = $1 AND EXISTS (
      SELECT 1 FROM digitallibrary.resolution_series peer
      JOIN public.unified_documents visible ON visible.ppb_full_document_symbol = peer.document_symbol
      WHERE peer.series_key = rs.series_key AND peer.un_body = rs.un_body AND peer.doc_type = rs.doc_type
        AND (visible.is_catalog_pattern OR EXISTS (
          SELECT 1 FROM ppb2026.source_document_citations c
          WHERE c.ppb_full_document_symbol = visible.ppb_full_document_symbol)))
  )
  SELECT member.document_symbol AS ppb_full_document_symbol, NULL::text AS ppb_link,
    EXTRACT(year FROM d.date_publication)::int AS ppb_year, member.un_body AS ppb_body,
    d.title AS ppb_description, d.display_title, member.doc_type AS ppb_type,
    d.subjects, d.agenda_items, '0' AS num_entities, '0' AS num_citations, ARRAY[]::text[] AS entities
  FROM member JOIN digitallibrary.documents d ON d.recid = member.recid
  WHERE d.deleted_at IS NULL
`
export async function getHistoricalDocument(symbol: string): Promise<HistoricalDocumentRow | null> {
  const rows = await queryMany<HistoricalDocumentRow>(historicalDocumentSql, [symbol])
  // Multiple records without a unique identity need review, not arbitrary selection.
  return rows.length === 1 ? rows[0] : null
}
