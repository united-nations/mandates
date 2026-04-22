-- Replace single-column idx_paragraphs_symbol with a composite (document_symbol, position)
-- covering the common query: WHERE document_symbol = $1 ORDER BY position

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_paragraphs_symbol_position
  ON mandates.paragraphs (document_symbol, position);

DROP INDEX CONCURRENTLY IF EXISTS mandates.idx_paragraphs_symbol;
