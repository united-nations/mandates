-- Migration: grant the website's read-only role SELECT on the Digital Library
-- document* fulltext tables it reads at runtime.
--
-- Bug this fixes
--   /mandate/<symbol> pages 500'd in production for every document that has no
--   curated mandates.paragraphs rows (E/RES/2025/*, A/RES/77/1, A/RES/79/313,
--   S/RES/2825, ...). getParagraphsBySymbol (website/src/lib/data/paragraphs.ts)
--   is a two-arm fallback: Arm 1 reads mandates.paragraphs and, only when that
--   is empty, Arm 2 reads digitallibrary.document_paragraphs. The app connects
--   as mandates_readonly, which had SELECT on digitallibrary.documents and
--   digitallibrary.resolution_series (so richly-curated docs rendered) but was
--   never granted SELECT on digitallibrary.document_paragraphs -> Postgres
--   42501 "permission denied for table document_paragraphs" on the Arm 2 path.
--   It never reproduced locally because dev connects as the schema admin, which
--   bypasses table ACLs.
--
-- Why the gap existed
--   digitallibrary.document_paragraphs / document_parses are the newer NLP/
--   fulltext enrichment tables (owned by digitallibrary_rw, maintained by the
--   external DL-sync repo). When they were added, the read grant for
--   mandates_readonly was not extended to them. This brings mandates_readonly
--   to parity with the intended digitallibrary document* read set already
--   granted to the human read-only role (see sql/roles/wannes.sql).
--
-- Idempotent: GRANT is a no-op if the privilege already exists. The role and
-- schema-level USAGE already exist; the USAGE grant is repeated here only so a
-- fresh replay of this migration is self-contained.

GRANT USAGE ON SCHEMA digitallibrary TO mandates_readonly;

-- The fix: Arm 2 of getParagraphsBySymbol reads this table directly.
GRANT SELECT ON digitallibrary.document_paragraphs TO mandates_readonly;

-- Sibling enrichment table with the identical missing grant. Not read by the
-- app today, but granted alongside so the document* read set stays coherent
-- and a future consumer (e.g. a unified fulltext view) cannot hit the same 42501.
GRANT SELECT ON digitallibrary.document_parses TO mandates_readonly;
