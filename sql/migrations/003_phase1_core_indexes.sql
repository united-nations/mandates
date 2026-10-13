-- Phase 1: Core indexes for join columns and equality filters
-- Run with CONCURRENTLY so existing queries are not blocked.
-- Must be run outside a transaction block (psql \i or separate connection).

-- metadata_clean has zero indexes — every query joins on this column
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_metadata_clean_symbol
  ON ppb2026.source_documents_metadata_clean (ppb_full_document_symbol);

-- organ filter: WHERE d.ppb_body = $n  (also GROUP BY ppb_body in organ counts)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_source_docs_body
  ON ppb2026.source_documents (ppb_body);

-- year range filter: WHERE d.ppb_year >= $n AND d.ppb_year <= $n
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_source_docs_year
  ON ppb2026.source_documents (ppb_year);

-- document_type filter: WHERE LOWER(d.ppb_type) = LOWER($n)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_source_docs_type_lower
  ON ppb2026.source_documents (LOWER(ppb_type));

-- citations composite: covers getMandateCitations WHERE + ORDER BY entity, programme
-- Supersedes the existing single-column ix_ppb2026_citations_symbol
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_citations_symbol_entity_programme
  ON ppb2026.source_document_citations (ppb_full_document_symbol, entity, programme);

-- date_year for ORDER BY COALESCE(m.date_year, d.ppb_year) when sort_by=year_*
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_metadata_date_year
  ON ppb2026.source_documents_metadata_clean (date_year);
