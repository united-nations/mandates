-- Refresh the unified_documents materialized view.
--
-- Run this after ANY import that changes the underlying tables
-- (ppb2026.source_documents, digitallibrary.documents, ppb2026.organs):
--
--     psql "$DATABASE_URL" -f sql/refresh_unified_documents.sql
--
-- Briefly takes an ACCESS EXCLUSIVE lock (~1s). The web app's 1h
-- unstable_cache means live readers rarely hit the matview directly,
-- so this is safe to run during low-traffic import windows.
--
-- See sql/migrations/011_unified_documents_matview.sql for rationale.

refresh materialized view public.unified_documents;
