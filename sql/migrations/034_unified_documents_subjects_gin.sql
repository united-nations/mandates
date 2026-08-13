-- GIN index on public.unified_documents.subjects.
--
-- WHY: the mandate detail page's "related mandate documents" feature
-- (website/src/lib/data/related.ts) finds candidates with the array-overlap
-- operator:
--
--     where d.subjects && $1::text[]
--
-- Without a GIN index that is a sequential scan of the whole matview on every
-- detail-page load. Measured on the current corpus: ~237 ms for the overlap
-- join alone, which is the floor under the feature's ~250-470 ms total. The
-- index removes that floor.
--
-- The same index also serves the corpus-wide subject document-frequency
-- aggregate that supplies the IDF weights.
--
-- Safe to re-run. Note this indexes a MATERIALIZED VIEW: the index survives
-- `refresh materialized view` (non-concurrent refresh rebuilds it), so
-- sql/refresh_unified_documents.sql needs no change.
--
-- Apply with:
--     psql "$DATABASE_URL" -f sql/migrations/034_unified_documents_subjects_gin.sql

create index if not exists unified_documents_subjects_gin
    on public.unified_documents using gin (subjects);
