/**
 * One bounded lookup per page/history, never per row. Series order is rebuilt
 * from the complete series, independently of table filters and pagination.
 * Conservative freshness: unchanged reparses need metrics revalidation too.
 */
export const textMetricsSql = `
WITH requested AS (SELECT unnest($1::text[]) AS symbol),
selected_groups AS (
  SELECT DISTINCT rs.series_key, rs.un_body, rs.doc_type
  FROM digitallibrary.resolution_series rs
  JOIN requested r ON r.symbol = rs.document_symbol
), relevant AS (
  SELECT DISTINCT ON (rs.document_symbol) rs.document_symbol, rs.recid,
    rs.series_key, rs.un_body, rs.doc_type, rs.is_collection, d.date_publication,
    (SELECT count(*) FROM digitallibrary.resolution_series duplicates
      WHERE duplicates.document_symbol = rs.document_symbol) AS symbol_occurrences
  FROM digitallibrary.resolution_series rs
  JOIN selected_groups g ON g.series_key = rs.series_key
    AND g.un_body = rs.un_body AND g.doc_type = rs.doc_type
  LEFT JOIN digitallibrary.documents d ON d.recid = rs.recid
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
      AND prev.date_count = 1 AND o.predecessor IS NOT NULL AS valid_pair
  FROM ordered o
  LEFT JOIN ordered prev ON prev.document_symbol = o.predecessor
), eligible AS (
  SELECT tm.* FROM digitallibrary.document_text_metrics tm
  JOIN digitallibrary.document_files f USING (symbol_normalized, lang)
  JOIN digitallibrary.document_parses p USING (symbol_normalized, lang)
  WHERE tm.lang = 'en' AND tm.text_profile_version = 'substantive-v1'
    AND tm.metric_version = 'unicode-word-v1' AND f.status = 'parsed'
    AND tm.parser_version = p.parser_version AND tm.computed_at >= p.parsed_at
    AND (tm.symbol_normalized IN (SELECT symbol FROM requested)
      OR tm.symbol_normalized IN (SELECT predecessor FROM pairs JOIN requested
        ON requested.symbol = pairs.document_symbol))
)
SELECT r.symbol,
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
