-- Phase 2: GIN trigram indexes for LIKE '%...%' and regex filters
-- Requires pg_trgm extension. Run CONCURRENTLY outside a transaction block.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- programme filter: EXISTS(... LOWER(programme_title) LIKE '%...%')
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_citations_programme_title_trgm
  ON ppb2026.source_document_citations
  USING GIN (LOWER(programme_title) gin_trgm_ops);

-- budget_document filter: origin_document ~ <regex from budget_documents.match_pattern>
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_citations_origin_doc_trgm
  ON ppb2026.source_document_citations
  USING GIN (origin_document gin_trgm_ops);

-- subject filter: EXISTS(... LOWER(subject_terms::text) LIKE '%...%')
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_metadata_subject_trgm
  ON ppb2026.source_documents_metadata_clean
  USING GIN (LOWER(subject_terms::text) gin_trgm_ops);

-- keyword search: LOWER(proper_title) LIKE '%...%'  (primary display title field)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_metadata_proper_title_trgm
  ON ppb2026.source_documents_metadata_clean
  USING GIN (LOWER(proper_title) gin_trgm_ops);

-- Drop uniform_title index — no longer searched after field alignment
DROP INDEX CONCURRENTLY IF EXISTS ix_metadata_uniform_title_trgm;

-- keyword search: LOWER(title) LIKE '%...%'
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_metadata_title_trgm
  ON ppb2026.source_documents_metadata_clean
  USING GIN (LOWER(title) gin_trgm_ops);

-- keyword search: LOWER(ppb_description) LIKE '%...%'
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_source_docs_description_trgm
  ON ppb2026.source_documents
  USING GIN (LOWER(ppb_description) gin_trgm_ops);

-- keyword search: LOWER(ppb_full_document_symbol) LIKE '%...%'
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_source_docs_symbol_trgm
  ON ppb2026.source_documents
  USING GIN (LOWER(ppb_full_document_symbol) gin_trgm_ops);

-- Drop the old single-column index now superseded by ix_citations_symbol_entity_programme
-- Only run after confirming migration 003 completed successfully.
DROP INDEX CONCURRENTLY IF EXISTS ix_ppb2026_citations_symbol;
