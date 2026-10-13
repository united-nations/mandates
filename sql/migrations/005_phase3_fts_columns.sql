-- Phase 3: Full-text search via generated tsvector columns
-- These columns are STORED (updated automatically on write).
-- After applying, update the keyword filter in src/lib/data/mandates.ts
-- to use  fts_vector @@ plainto_tsquery('english', $n)  instead of LIKE.
--
-- Covered fields per table:
--   source_documents        → ppb_full_document_symbol, ppb_description
--   source_documents_metadata_clean → uniform_title, title, subject_terms (array)

ALTER TABLE ppb2026.source_documents
  ADD COLUMN IF NOT EXISTS fts_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      COALESCE(ppb_full_document_symbol, '') || ' ' ||
      COALESCE(ppb_description, '')
    )
  ) STORED;

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_source_docs_fts
  ON ppb2026.source_documents USING GIN (fts_vector);

ALTER TABLE ppb2026.source_documents_metadata_clean
  ADD COLUMN IF NOT EXISTS fts_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      COALESCE(uniform_title, '') || ' ' ||
      COALESCE(title, '') || ' ' ||
      COALESCE(subject_terms, '')
    )
  ) STORED;

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_metadata_fts
  ON ppb2026.source_documents_metadata_clean USING GIN (fts_vector);
