-- Migration: import PPB 2027 special political mission (SPM) citations.
--
-- SPMs are funded from the regular budget under Part II, Section 3, "Political
-- affairs", but their detail is published as addenda to that section rather than
-- in the section fascicle itself. For 2027 the Secretary-General presents them
-- in three thematic clusters (A/81/6 (Sect. 3)/Add.1 is the overview and carries
-- no individual missions):
--
--   Add.2  thematic cluster I   -- special and personal envoys, advisers and
--                                 representatives of the Secretary-General
--   Add.3  thematic cluster II  -- sanctions monitoring teams, groups and panels
--   Add.4  thematic cluster III -- regional offices, offices in support of
--                                 political processes and other missions
--
-- One structural change from 2026: UNAMA, previously budgeted on its own in
-- Add.5, is folded into cluster III. UNAMI is gone (mandate expired 31 December
-- 2025), as are UNMHA (ended 31 March 2026) and UNTMIS (ends 31 October 2026).
-- The result is 36 missions, matching the count Add.1 states for itself.
--
-- Migration 007 imported PPB 2027 before these addenda existed, so none of their
-- citations are in the DB.
--
-- SECTION VALUE: the pipeline emits section = '3' with the addendum number in a
-- separate column, but PPB 2026 stores these as '3 (Add.2)' ... '3 (Add.6)'.
-- This importer folds the addendum back into the section so both budget versions
-- are shaped the same and the explorer groups them identically.
--
-- SCOPE-AND-REPLACE / RE-RUNNABLE
--   The source documents are currently the *preliminary* (advance, unedited)
--   versions. When the final A/81/6 (Sect. 3)/Add.N are published, regenerate
--   all_mandates.csv and run this script again verbatim: it first DELETEs every
--   PPB 2027 citation whose section looks like '3 (Add.%', then re-inserts from
--   the CSV, so the addenda are replaced wholesale. Section 3 itself and the
--   other sections are never touched -- staging is narrowed to addendum rows
--   before anything is written.
--
--   Safe for the same reason as migration 022: nothing foreign-keys to
--   source_document_citations.id, and mandates_housekeeping review data keys on
--   (document_symbol, entity, subprogramme) rather than citation ids.
--
-- PREREQUISITE: migration 030 (renames OSASG-Cyprus -> GOM-Cyprus and
--   OSESG-SCRES1559 -> SC-RES1559 and registers SR-RES2792 / PoE-Iran, so the
--   2026 and 2027 rows agree on one code per mission).
--
-- AFTER RUNNING: refresh the unified_documents materialized view --
--     psql "$DATABASE_URL" -f sql/refresh_unified_documents.sql
--
-- Run with: psql "$DATABASE_URL" -f sql/migrations/031_import_ppb2027_spm.sql

BEGIN;

-- 1. Ensure the PPB 2027 budget_documents entry exists (created by 007; this is
--    idempotent and lets the migration stand alone).
INSERT INTO ppb2026.budget_documents (slug, display_name, match_pattern, doc_type, sort_order)
VALUES ('ppb2027', 'Proposed Programme Budget for 2027', '^PPB 2027$', 'ppb', 0)
ON CONFLICT (slug) DO NOTHING;

-- 2. Staging table mirroring all_mandates.csv, in CSV column order.
--    NOTE: this is wider than the staging tables in migrations 007 and 022 --
--    the pipeline has since added `part_title` (after `part`) and a trailing
--    `organ` column, so those two importers can no longer \copy the current CSV
--    without erroring ("extra data after last expected column"). They need the
--    same two columns added before they can be re-run as their headers promise.
CREATE TEMP TABLE _ppb2027_spm_staging (
    origin_document TEXT,
    part_in_document TEXT,
    file TEXT,
    addendum TEXT,
    part TEXT,
    part_title TEXT,
    section TEXT,
    section_title TEXT,
    entity_long TEXT,
    entity TEXT,
    programme TEXT,
    programme_title TEXT,
    subprogramme TEXT,
    subprogramme_title TEXT,
    description TEXT,
    link TEXT,
    symbol TEXT,
    full_document_symbol TEXT,
    source TEXT,
    organ TEXT
);

-- 3. Load the full CSV, then narrow to the PPB 2027 Section 3 addendum rows so
--    nothing else is affected.
\copy _ppb2027_spm_staging FROM 'data/processed/ppb2027/all_mandates.csv' WITH (FORMAT csv, HEADER true);

DELETE FROM _ppb2027_spm_staging
WHERE origin_document IS DISTINCT FROM 'PPB 2027'
   OR section IS DISTINCT FROM '3'
   OR addendum IS NULL
   OR addendum = '';

-- 4. Fold the addendum number into the section, matching the PPB 2026 shape.
UPDATE _ppb2027_spm_staging
SET section = section || ' (Add.' || addendum || ')';

-- 5. Fall back to the citation symbol when full_document_symbol is empty. This
--    matters more here than elsewhere: mandates recovered from the prose of the
--    unhyperlinked preliminary addenda have no link to derive a symbol from.
UPDATE _ppb2027_spm_staging
SET full_document_symbol = symbol
WHERE full_document_symbol IS NULL OR full_document_symbol = '';

-- 6. SCOPE: remove any existing PPB 2027 SPM citations before re-inserting.
DELETE FROM ppb2026.source_document_citations
WHERE origin_document = 'PPB 2027' AND section LIKE '3 (Add.%';

-- 7. Register any source documents not already known (additive; never deleted).
INSERT INTO ppb2026.source_documents (
    ppb_full_document_symbol,
    ppb_document_source,
    ppb_description,
    ppb_symbol,
    ppb_link
)
SELECT DISTINCT
    s.full_document_symbol,
    s.source,
    s.description,
    s.symbol,
    s.link
FROM _ppb2027_spm_staging s
WHERE s.full_document_symbol IS NOT NULL
  AND s.full_document_symbol != ''
ON CONFLICT (ppb_full_document_symbol) DO NOTHING;

-- 7b. Register any entity systemchart.entities does not yet hold --
--     source_document_citations.entity is FK'd to it. After migration 030 every
--     one of the 36 missions already exists, so this is a safety net for a
--     mission added between now and the final addenda.
--     ON CONFLICT DO NOTHING so curated long names are never overwritten.
INSERT INTO systemchart.entities (entity, entity_long)
SELECT DISTINCT s.entity, s.entity_long
FROM _ppb2027_spm_staging s
WHERE s.entity IS NOT NULL
  AND s.entity != ''
ON CONFLICT (entity) DO NOTHING;

-- 8. Insert the SPM citations.
INSERT INTO ppb2026.source_document_citations (
    ppb_full_document_symbol,
    entity,
    origin_document,
    part_in_document,
    section,
    section_title,
    budget_part,
    budget_part_number,
    programme,
    programme_title,
    sub_programme
)
SELECT
    s.full_document_symbol,
    s.entity,
    s.origin_document,
    s.part_in_document,
    s.section,
    s.section_title,
    -- PPB 2026 stores these as budget_part 'Political affairs' / part number
    -- 'II'; the CSV carries the same values in part_title / part.
    s.part_title,
    s.part,
    CASE WHEN s.programme ~ '^\d+(\.\d+)?$' THEN s.programme::numeric::smallint ELSE NULL END,
    s.programme_title,
    CASE
        WHEN s.subprogramme IS NOT NULL AND s.subprogramme != ''
        THEN 'Subprogramme ' || s.subprogramme::text ||
             CASE WHEN s.subprogramme_title IS NOT NULL AND s.subprogramme_title != ''
                  THEN '. ' || s.subprogramme_title
                  ELSE ''
             END
        ELSE NULL
    END
FROM _ppb2027_spm_staging s
WHERE s.full_document_symbol IS NOT NULL
  AND s.full_document_symbol != ''
-- Citations are coarser than CSV rows: the natural key excludes
-- description/link/symbol, so a resolution cited in several sentences of the
-- same "Mandates and background" subsection collapses to one citation. Skip the
-- repeats, as migrations 007 and 022 do.
ON CONFLICT DO NOTHING;

-- 9. Cleanup.
DROP TABLE _ppb2027_spm_staging;

COMMIT;
