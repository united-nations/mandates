-- Migration: import the Commission on the Status of Women (CSW) session
-- outcomes as UN-Women legislative-mandate citations for the PPB 2027 vintage.
--
-- WHY
--   The 2026 PPB (A/80/6, Sect. 17) enumerated every CSW agreed conclusion and
--   political declaration as an individual legislative mandate. The 2027 PPB
--   (A/81/6, Sect. 17) stops enumerating them and instead states:
--
--     "The list of agreed conclusions from 1996 to 2025 is available at the
--      following link: www.unwomen.org/en/csw/outcomes."
--
--   So the 2027 import (migration 007) carries none of them. This migration
--   reproduces exactly that linked list -- and only that list -- so the 2027
--   UN-Women mandate view is not left hollow where the budget deferred to the
--   web page.
--
-- SOURCE (scrape-only, no merge with the 2026 enumeration)
--   data/references/csw_outcomes.csv, produced by
--   data-processing/utils/csw_outcomes.py from a snapshot of
--   www.unwomen.org/en/csw/outcomes. One row per downloadable outcome item
--   (each agreed conclusion, each standalone/political declaration, the 1996
--   resolution, and the 2025 session report). Sessions the page shows as "no
--   agreed conclusions adopted" (2000, 2012) and sessions absent from the page
--   (67th/2023, 68th/2024) produce no rows -- faithful to the page as published.
--
--   Individual agreed conclusions have no per-item ODS document symbol (they are
--   sections of a session report), so ppb_full_document_symbol is a stable,
--   scrape-derived synthetic key of the form 'CSW/{year}/{slug}'. The real
--   session-report symbol, where the page prints one, is preserved only in the
--   scraper output; ppb_symbol carries the CSW numbering (e.g. '2004/11').
--
-- RE-RUNNABLE / SCOPE-AND-REPLACE
--   Idempotent. It DELETEs every PPB 2027 citation whose symbol is 'CSW/%' and
--   re-inserts from the CSV, so refreshing the scrape and re-running replaces the
--   set wholesale. Nothing else is touched (2026 rows, other 2027 rows, other
--   sections). Source documents are upserted (additive + kept fresh); nothing
--   foreign-keys to source_document_citations.id.
--
-- PREREQUISITE: migration 007 (PPB 2027 imported; entity 'UN Women' registered
--   in systemchart.entities and grouping columns established).
--
-- AFTER RUNNING: refresh the unified_documents materialized view --
--     psql "$DATABASE_URL" -f sql/refresh_unified_documents.sql
--
-- Run with: psql "$DATABASE_URL" -f sql/migrations/034_import_csw_outcomes.sql

BEGIN;

-- 1. Staging table mirroring data/references/csw_outcomes.csv, in column order.
CREATE TEMP TABLE _csw_staging (
    session              INTEGER,
    year                 INTEGER,
    type                 TEXT,
    item_label           TEXT,
    description          TEXT,
    report_symbol        TEXT,
    link_en              TEXT,
    full_document_symbol TEXT
);

\copy _csw_staging FROM 'data/references/csw_outcomes.csv' WITH (FORMAT csv, HEADER true);

-- 2. Register / refresh the source documents (additive; kept in sync on re-run).
--    Grouped under the same ppb_document_source the 2026 E/CN.6 conclusions use.
INSERT INTO ppb2026.source_documents (
    ppb_full_document_symbol,
    ppb_document_source,
    ppb_description,
    ppb_symbol,
    ppb_link,
    ppb_type,
    ppb_year
)
SELECT
    s.full_document_symbol,
    'Agreed conclusions of the Commission on the Status of Women',
    s.description,
    NULLIF(s.item_label, ''),
    NULLIF(s.link_en, ''),
    CASE s.type
        WHEN 'agreed conclusions'    THEN 'Conclusions'
        WHEN 'declaration'           THEN 'Declaration'
        WHEN 'political declaration' THEN 'Declaration'
        WHEN 'resolution'            THEN 'Resolution'
        WHEN 'report'                THEN 'Report'
        ELSE 'Conclusions'
    END,
    s.year
FROM _csw_staging s
WHERE s.full_document_symbol IS NOT NULL
  AND s.full_document_symbol != ''
ON CONFLICT (ppb_full_document_symbol) DO UPDATE SET
    ppb_document_source = EXCLUDED.ppb_document_source,
    ppb_description     = EXCLUDED.ppb_description,
    ppb_symbol          = EXCLUDED.ppb_symbol,
    ppb_link            = EXCLUDED.ppb_link,
    ppb_type            = EXCLUDED.ppb_type,
    ppb_year            = EXCLUDED.ppb_year,
    last_updated        = now();

-- 3. SCOPE: remove any existing PPB 2027 CSW citations before re-inserting.
DELETE FROM ppb2026.source_document_citations
WHERE origin_document = 'PPB 2027'
  AND ppb_full_document_symbol LIKE 'CSW/%';

-- 4. Insert the citations, grouped identically to the other PPB 2027 UN-Women
--    legislative mandates (section 17, programme 14, Part IV).
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
    programme_title
)
SELECT
    s.full_document_symbol,
    'UN Women',
    'PPB 2027',
    'Legislative mandates',
    '17',
    'UN-Women',
    'International cooperation for development',
    'IV',
    14,
    'Gender equality and the empowerment of women'
FROM _csw_staging s
WHERE s.full_document_symbol IS NOT NULL
  AND s.full_document_symbol != ''
ON CONFLICT DO NOTHING;

-- 5. Cleanup.
DROP TABLE _csw_staging;

COMMIT;
