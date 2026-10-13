-- Migration: Import PPB 2027, Section 1 mandate citations.
--
-- Section 1 (A/81/6 (Sect. 1), "Overall policymaking, direction and
-- coordination") was not in the corpus when migration 007 imported PPB 2027,
-- so its citations are missing from the DB. This migration adds them.
--
-- SCOPE-AND-REPLACE / RE-RUNNABLE
--   The source document is currently the *preliminary* version. When the final
--   A/81/6 (Sect. 1) is published, regenerate all_mandates.csv and run this
--   script again verbatim: it first DELETEs every PPB 2027 Section 1 citation,
--   then re-inserts from the CSV, so the section is replaced wholesale. The
--   other 34 sections (imported by 007) are never touched -- staging is
--   filtered to section = '1' before anything is written.
--
--   This is safe because nothing foreign-keys to
--   source_document_citations.id. Review data in mandates_housekeeping keys on
--   (document_symbol, entity, subprogramme), not on citation ids, so replacing
--   the citation rows leaves existing decisions/comments attached (the Section 1
--   entity names emitted by the pipeline were aligned to the PPB 2026 cycle for
--   exactly this reason -- see data/references/entity_names.tsv).
--
--   source_documents is a document registry and is only ever added to (ON
--   CONFLICT DO NOTHING); orphaned rows there are harmless and shared across
--   sections/cycles, so they are deliberately not deleted.
--
-- NOTE: policymaking-organ mandates (Sect. 1 table 1.4) are intentionally NOT
-- present in the CSV -- extraction is gated off pending an entity-modelling
-- decision (EXTRACT_POLICYMAKING_ORGANS in c_extract_parsed.py). When enabled,
-- re-running this script picks them up automatically.
--
-- AFTER RUNNING: refresh the unified_documents materialized view --
--     psql "$DATABASE_URL" -f sql/refresh_unified_documents.sql
--
-- Run with: psql "$DATABASE_URL" -f sql/migrations/022_import_ppb2027_section1.sql

BEGIN;

-- 1. Ensure the PPB 2027 budget_documents entry exists (created by 007; this is
--    idempotent and lets the migration stand alone).
INSERT INTO ppb2026.budget_documents (slug, display_name, match_pattern, doc_type, sort_order)
VALUES ('ppb2027', 'Proposed Programme Budget for 2027', '^PPB 2027$', 'ppb', 0)
ON CONFLICT (slug) DO NOTHING;

-- 2. Staging table mirroring all_mandates.csv (same shape as migration 007).
CREATE TEMP TABLE _ppb2027_s1_staging (
    origin_document TEXT,
    part_in_document TEXT,
    file TEXT,
    addendum TEXT,
    part TEXT,
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
    source TEXT
);

-- 3. Load the full CSV, then narrow to Section 1 so nothing else is affected.
\copy _ppb2027_s1_staging FROM 'data/processed/ppb2027/all_mandates.csv' WITH (FORMAT csv, HEADER true);

DELETE FROM _ppb2027_s1_staging
WHERE origin_document <> 'PPB 2027' OR section IS DISTINCT FROM '1';

-- 4. Normalize entity name (UN-Women -> UN Women), matching migration 007. No
--    Section 1 rows currently need this, but keep it so the two importers agree.
UPDATE _ppb2027_s1_staging SET entity = 'UN Women' WHERE entity = 'UN-Women';

-- 5. Fall back to the citation symbol when full_document_symbol is empty.
UPDATE _ppb2027_s1_staging
SET full_document_symbol = symbol
WHERE full_document_symbol IS NULL OR full_document_symbol = '';

-- 6. SCOPE: remove any existing PPB 2027 Section 1 citations before re-inserting.
DELETE FROM ppb2026.source_document_citations
WHERE origin_document = 'PPB 2027' AND section = '1';

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
FROM _ppb2027_s1_staging s
WHERE s.full_document_symbol IS NOT NULL
  AND s.full_document_symbol != ''
ON CONFLICT (ppb_full_document_symbol) DO NOTHING;

-- 7b. Register any entity we are about to cite that systemchart.entities does
--     not yet hold -- source_document_citations.entity is FK'd to it. Every
--     established Section 1 entity already exists (the pipeline emits the 2026
--     names); this covers genuinely new offices such as UNSDG-SWEO (United
--     Nations Sustainable Development Group System-Wide Evaluation Office).
--     ON CONFLICT DO NOTHING so curated long names are never overwritten -- e.g.
--     DCO keeps "Development Coordination Office", not the CSV's "Resident
--     coordinator system".
INSERT INTO systemchart.entities (entity, entity_long)
SELECT DISTINCT s.entity, s.entity_long
FROM _ppb2027_s1_staging s
WHERE s.entity IS NOT NULL
  AND s.entity != ''
ON CONFLICT (entity) DO NOTHING;

-- 8. Insert the Section 1 citations.
INSERT INTO ppb2026.source_document_citations (
    ppb_full_document_symbol,
    entity,
    origin_document,
    part_in_document,
    section,
    section_title,
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
FROM _ppb2027_s1_staging s
WHERE s.full_document_symbol IS NOT NULL
  AND s.full_document_symbol != ''
-- Citations are coarser than CSV rows: the natural key
-- (ux_ppb2026_citations_natural) excludes description/link/symbol, so a
-- resolution cited in several sentences of the same "Mandates and background"
-- subsection (e.g. SRSG-CAAC's S/RES/1261(1999)) yields several identical
-- citation rows that collapse to one. Skip the repeats, as migration 007 does
-- for every other section.
ON CONFLICT DO NOTHING;

-- 9. Cleanup.
DROP TABLE _ppb2027_s1_staging;

COMMIT;
