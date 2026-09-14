/** Content fingerprint for a bounded list of cached documents. Read-only.
 * Include semantic text, raw text, classifications, ownership and ledger warnings;
 * a timestamp alone cannot establish whether retained text still matches a cache.
 */
export const retainedTextSql = `
WITH requested AS (SELECT unnest($1::text[]) AS symbol), snapshots AS (
  SELECT r.symbol, jsonb_build_object(
    'status', f.status, 'error', f.error, 'source_symbol', f.source_symbol,
    'parser_version', p.parser_version, 'element_count', p.element_count,
    'issues', p.issues, 'dropped', p.dropped,
    'elements', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'position', e.position, 'type', e.type, 'subtype', e.subtype,
        'section', e.section, 'paragraph_type', e.paragraph_type,
        'text', e.text, 'prefix', e.prefix, 'positions', e.raw_positions,
        'vote', e.vote, 'note_ids', e.note_ids, 'parser_version', e.parser_version
      ) ORDER BY e.position)
      FROM digitallibrary.document_paragraphs e
      WHERE e.symbol_normalized = r.symbol AND e.lang = 'en'
    ), '[]'::jsonb),
    'raw', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('position', raw.position,
        'text', raw.text, 'kind', raw.kind, 'source_symbol', raw.source_symbol
      ) ORDER BY raw.position)
      FROM digitallibrary.document_paragraphs_raw raw
      WHERE raw.symbol_normalized = r.symbol AND raw.lang = 'en'
    ), '[]'::jsonb)
  ) AS snapshot
  FROM requested r
  LEFT JOIN digitallibrary.document_files f ON f.symbol_normalized = r.symbol AND f.lang = 'en'
  LEFT JOIN digitallibrary.document_parses p ON p.symbol_normalized = r.symbol AND p.lang = 'en'
)
SELECT symbol, md5(snapshot::text) AS source_fingerprint,
  CASE WHEN $2::boolean THEN snapshot END AS snapshot
FROM snapshots
`
