/** Indexed exact-symbol and canonical-symbol lookups share the same family guards. */
export const resolutionFamilySql = `/* trace:sg-reports.resolution-family */
     WITH me AS (
       SELECT DISTINCT rs.series_key, rs.un_body, rs.doc_type, rs.is_collection
       FROM digitallibrary.resolution_series rs
       JOIN digitallibrary.documents d ON d.recid = rs.recid
       WHERE rs.document_symbol = $1
       UNION
       SELECT DISTINCT rs.series_key, rs.un_body, rs.doc_type, rs.is_collection
       FROM digitallibrary.documents d
       JOIN digitallibrary.resolution_series rs ON rs.recid=d.recid
       WHERE d.symbol_normalized = upper(regexp_replace($1, '[[:space:]]', '', 'g'))
     )
     SELECT DISTINCT ON (COALESCE(d.symbol_normalized, rs.document_symbol))
       CASE WHEN d.symbol_normalized = upper(regexp_replace($1, '[[:space:]]', '', 'g'))
         THEN $1 ELSE rs.document_symbol END AS symbol,
       d.symbol_normalized AS canonical
     FROM me
     JOIN digitallibrary.resolution_series rs
       ON rs.series_key = me.series_key
      AND rs.un_body = me.un_body
      AND rs.doc_type = me.doc_type
     JOIN digitallibrary.documents d ON d.recid = rs.recid
     WHERE (SELECT count(*) FROM me) = 1
       AND (NOT me.is_collection
         OR d.symbol_normalized = upper(regexp_replace($1, '[[:space:]]', '', 'g')))
     ORDER BY COALESCE(d.symbol_normalized, rs.document_symbol), rs.document_symbol`
