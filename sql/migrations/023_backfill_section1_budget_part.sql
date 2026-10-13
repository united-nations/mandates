-- Migration: Backfill budget_part_number for citations imported after 021.
--
-- Migration 021 added source_document_citations.budget_part_number and
-- backfilled every PPB row that existed at the time. Migration 022 then
-- imported PPB 2027 Section 1 *after* that backfill and does not set the part
-- itself, so those ~231 rows are left with a NULL budget_part_number and are
-- invisible to the budget hierarchy (tree, filter, Budget Location column).
--
-- Re-run 021's backfill. It is idempotent -- the DISTINCT FROM guard means
-- already-correct rows are untouched -- so this safely catches Section 1 and any
-- other post-021 import. Section 1 maps to Part I via ppb2026.budget_sections.
--
-- Run with: psql "$DATABASE_URL" -f sql/migrations/023_backfill_section1_budget_part.sql

BEGIN;

UPDATE ppb2026.source_document_citations c
SET budget_part_number = s.part_number
FROM ppb2026.budget_sections s
WHERE c.origin_document LIKE 'PPB %'
  AND s.section = regexp_replace(c.section, '\s*\(Add\..*\)$', '')
  AND c.budget_part_number IS DISTINCT FROM s.part_number;

-- Fill the legacy title column too, matching 021 step 5, for any row whose
-- part was just set and whose budget_part is still NULL (all of PPB 2027).
UPDATE ppb2026.source_document_citations c
SET budget_part = p.part_title
FROM ppb2026.budget_parts p
WHERE c.budget_part IS NULL
  AND c.budget_part_number = p.part_number;

COMMIT;
