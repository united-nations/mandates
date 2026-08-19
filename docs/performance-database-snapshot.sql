SELECT
  (SELECT COUNT(*) FROM public.unified_documents) AS total_documents,
  (
    SELECT COUNT(DISTINCT ppb_full_document_symbol)
    FROM ppb2026.source_document_citations
  ) AS cited_documents,
  (SELECT COUNT(*) FROM ppb2026.source_document_citations) AS citations,
  (SELECT COUNT(*) FROM ppb2026.subject_thesaurus) AS subject_terms,
  (SELECT COUNT(*) FROM digitallibrary.resolution_series) AS resolution_series_rows,
  EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
  ) AS pg_stat_statements_available;
