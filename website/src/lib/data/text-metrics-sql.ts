/**
 * Shared eligibility for page/history display and full-result metric sorting.
 * Series order uses the complete series, independently of filters/pagination.
 * Window functions avoid self-joining the unindexed chronology CTE at catalogue
 * scale. Project only scalar metrics: token_text must never be materialized.
 * Conservative freshness: unchanged reparses need metrics revalidation too.
 */
export function buildTextMetricsSql(
  requestedSql = 'SELECT unnest($1::text[]) AS symbol'
): string {
  return `
WITH requested AS (${requestedSql}),
series_symbols AS (
  SELECT rs.document_symbol, rs.recid, rs.series_key, rs.un_body, rs.doc_type,
    rs.is_collection,
    count(*) OVER (PARTITION BY rs.document_symbol) AS symbol_occurrences
  FROM digitallibrary.resolution_series rs
), selected_groups AS (
  SELECT DISTINCT rs.series_key, rs.un_body, rs.doc_type
  FROM digitallibrary.resolution_series rs
  JOIN requested r ON r.symbol = rs.document_symbol
), relevant AS (
  SELECT DISTINCT ON (rs.document_symbol) rs.document_symbol, rs.recid,
    rs.series_key, rs.un_body, rs.doc_type, rs.is_collection, d.date_publication,
    rs.symbol_occurrences
  FROM series_symbols rs
  LEFT JOIN digitallibrary.documents d ON d.recid = rs.recid
  WHERE EXISTS (
    SELECT 1 FROM selected_groups g WHERE g.series_key = rs.series_key
      AND g.un_body = rs.un_body AND g.doc_type = rs.doc_type
  )
  ORDER BY rs.document_symbol, rs.recid
), ordered AS (
  SELECT r.*,
    lag(document_symbol) OVER series_order AS predecessor,
    lag(date_publication) OVER series_order AS previous_date,
    count(*) OVER (PARTITION BY series_key, un_body, doc_type, date_publication) AS date_count,
    bool_or(date_publication IS NULL OR symbol_occurrences > 1)
      OVER (PARTITION BY series_key, un_body, doc_type) AS uncertain_series
  FROM relevant r
  WINDOW series_order AS (PARTITION BY series_key, un_body, doc_type
    ORDER BY date_publication NULLS LAST, document_symbol)
), pairs AS (
  SELECT o.*,
    NOT o.is_collection AND NOT o.uncertain_series AND o.date_count = 1
      AND lag(o.date_count) OVER (PARTITION BY series_key, un_body, doc_type
        ORDER BY date_publication NULLS LAST, document_symbol) = 1
      AND o.predecessor IS NOT NULL AS valid_pair
  FROM ordered o
), needed_symbols AS (
  SELECT symbol FROM requested
  UNION
  SELECT p.predecessor FROM pairs p JOIN requested r ON r.symbol = p.document_symbol
  WHERE p.predecessor IS NOT NULL
), eligible AS NOT MATERIALIZED (
  SELECT tm.symbol_normalized, tm.word_count, tm.content_sha256
  FROM digitallibrary.document_text_metrics tm
  JOIN needed_symbols n ON n.symbol = tm.symbol_normalized
  JOIN digitallibrary.document_files f USING (symbol_normalized, lang)
  JOIN digitallibrary.document_parses p USING (symbol_normalized, lang)
  WHERE tm.lang = 'en' AND tm.text_profile_version = 'substantive-v1'
    AND tm.metric_version = 'unicode-word-v1' AND f.status = 'parsed'
    AND tm.parser_version = p.parser_version AND tm.source_parsed_at = p.parsed_at
)
SELECT r.symbol,
  CASE WHEN pair.document_symbol IS NULL THEN 'not_in_series'
    WHEN pair.is_collection THEN 'collection'
    WHEN pair.uncertain_series OR pair.date_count <> 1 THEN 'ambiguous_order'
    WHEN pair.predecessor IS NULL THEN 'first'
    WHEN NOT pair.valid_pair THEN 'ambiguous_order'
    ELSE 'ordered' END AS comparison_unavailable_reason,
  current.word_count,
  CASE WHEN pair.valid_pair THEN pair.predecessor END AS previous_document_symbol,
  COALESCE(pair.valid_pair AND current.symbol_normalized IS NOT NULL
    AND previous.symbol_normalized IS NOT NULL, false) AS can_compare,
  CASE WHEN pair.valid_pair AND sc.comparison_status = 'ready'
    AND sc.previous_symbol_normalized = pair.predecessor
    AND sc.series_key = pair.series_key AND sc.un_body = pair.un_body AND sc.doc_type = pair.doc_type
    AND sc.publication_date = pair.date_publication AND sc.previous_publication_date = pair.previous_date
    AND sc.current_content_sha256 = current.content_sha256
    AND sc.previous_content_sha256 = previous.content_sha256
    THEN sc.similarity END AS similarity_to_previous
FROM requested r
LEFT JOIN pairs pair ON pair.document_symbol = r.symbol
LEFT JOIN eligible current ON current.symbol_normalized = r.symbol
LEFT JOIN eligible previous ON previous.symbol_normalized = pair.predecessor
LEFT JOIN digitallibrary.resolution_series_comparisons sc
  ON sc.symbol_normalized = r.symbol AND sc.lang = 'en'
  AND sc.text_profile_version = 'substantive-v1' AND sc.method_version = 'token-levenshtein-v1'
`
}

export const textMetricsSql = buildTextMetricsSql()
