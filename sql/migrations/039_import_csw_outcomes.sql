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
-- IDENTIFIERS -- no invented document symbols
--   Only 4 of the 40 items have a real UN document symbol, and only because the
--   page links straight into ODS: E/CN.6/2020/L.1, E/CN.6/2021/L.3,
--   E/CN.6/2022/L.7 and E/2025/27. Those are stored as-is, with ppb_not_ods
--   false. (None of the four already existed in source_documents.)
--
--   The other 36 link to UN Women's own branded PDF booklets, which carry no
--   document symbol anywhere on them -- the agreed conclusions are adopted as
--   chapters of the session report, so no standalone symbol exists to cite. For
--   these, ppb_full_document_symbol holds a readable label in the convention
--   this table already uses for exactly that situation --
--       'E/CN.15 Resolution 17/2', 'E/CN.7 Decision 60/1'   (existing rows)
--       'CSW Agreed conclusions 1998/I'                     (numbered items)
--       'CSW Declaration, 49th session (2005)'              (unnumbered items)
--   -- flagged ppb_not_ods = true with ppb_full_doc_symbol_available = 'IN
--   REPORT', the value the 25 existing E/CN.15 and E/CN.7 rows use. The label
--   reads as a description and cannot be mistaken for a document symbol.
--
--   No matching or reconciliation against the Digital Library is attempted: the
--   page is the sole authority for what exists and how it is identified.
--
-- RE-RUNNABLE / SCOPE-AND-REPLACE
--   Idempotent. It DELETEs every PPB 2027 citation for the keys the CSV carries
--   and re-inserts, so refreshing the scrape and re-running replaces the set
--   wholesale. Nothing else is touched (2026 rows, other 2027 rows, other
--   sections). Source documents are upserted (additive + kept fresh); nothing
--   foreign-keys to source_document_citations.id.
--
-- PREREQUISITE: migration 007 (PPB 2027 imported; entity 'UN Women' registered
--   in systemchart.entities and grouping columns established).
--
-- INTERACTION WITH MIGRATION 035
--   035 makes unified_documents derive ppb_type from the document symbol family
--   ('/RES/', '/DEC/', '/PRST/'), falling back to the curated source_documents
--   ppb_type where the symbol carries no type signal. Neither the readable 'CSW …'
--   labels nor the four L-document / session-report symbols match those patterns,
--   so the curated types set below -- Conclusions / Declaration / Report /
--   Resolution -- are what surface. Nothing to reconcile.
--
-- AFTER RUNNING: refresh the unified_documents materialized view --
--     psql "$DATABASE_URL" -f sql/refresh_unified_documents.sql
--
-- Run with: psql "$DATABASE_URL" -f sql/migrations/039_import_csw_outcomes.sql

BEGIN;

-- 1. Staging table mirroring data/references/csw_outcomes.csv, in column order.
CREATE TEMP TABLE _csw_staging (
    session       INTEGER,
    year          INTEGER,
    type          TEXT,
    item_label    TEXT,
    description   TEXT,
    report_symbol TEXT,
    link_en       TEXT,
    ods_symbol    TEXT,   -- real symbol, only where the page links into ODS
    document_key  TEXT    -- ods_symbol, else a readable non-symbol label
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
    ppb_year,
    ppb_not_ods,
    ppb_full_doc_symbol_available
)
SELECT
    s.document_key,
    'Agreed conclusions of the Commission on the Status of Women',
    s.description,
    -- The CSW's own numbering ('1998/I', '2004/11'), where the page prints one.
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
    s.year,
    -- Items keyed by a readable label are not ODS documents; the four keyed by a
    -- symbol the page links are. (Both columns are text, matching existing rows.)
    CASE WHEN coalesce(s.ods_symbol, '') = '' THEN 'true' ELSE 'false' END,
    CASE WHEN coalesce(s.ods_symbol, '') = '' THEN 'IN REPORT' ELSE 'TRUE' END
FROM _csw_staging s
WHERE s.document_key IS NOT NULL
  AND s.document_key != ''
ON CONFLICT (ppb_full_document_symbol) DO UPDATE SET
    ppb_document_source           = EXCLUDED.ppb_document_source,
    ppb_description               = EXCLUDED.ppb_description,
    ppb_symbol                    = EXCLUDED.ppb_symbol,
    ppb_link                      = EXCLUDED.ppb_link,
    ppb_type                      = EXCLUDED.ppb_type,
    ppb_year                      = EXCLUDED.ppb_year,
    ppb_not_ods                   = EXCLUDED.ppb_not_ods,
    ppb_full_doc_symbol_available = EXCLUDED.ppb_full_doc_symbol_available,
    last_updated                  = now();

-- 3. SCOPE: remove any existing PPB 2027 CSW citations before re-inserting --
--    both the keys this CSV carries and any left by an earlier run (including
--    the withdrawn 'CSW/{year}/{slug}' synthetic-symbol scheme).
DELETE FROM ppb2026.source_document_citations
WHERE origin_document = 'PPB 2027'
  AND (
        ppb_full_document_symbol LIKE 'CSW %'
     OR ppb_full_document_symbol LIKE 'CSW/%'
     OR ppb_full_document_symbol IN (SELECT document_key FROM _csw_staging)
  );

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
    s.document_key,
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
WHERE s.document_key IS NOT NULL
  AND s.document_key != ''
ON CONFLICT DO NOTHING;

-- 5. Cleanup.
DROP TABLE _csw_staging;

COMMIT;
