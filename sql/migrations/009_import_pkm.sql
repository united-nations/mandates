-- Migration: Import peacekeeping mission (PKM) mandate data for the 2026/27
-- budget cycle (A/80/604 series) from all_mandates.csv.
-- Adds new source_documents and source_document_citations rows.
-- Existing PKM 25/26 (A/79/724) data is untouched; origin_document
-- 'PKM 26/27 (A/80/604)' distinguishes the new cycle.
--
-- Format mirrors the existing PKM 25/26 rows already in the DB:
--   origin_document  = 'PKM 26/27 (A/80/604)'
--   section          = 'Add.<n>'
--   section_title    = GA agenda-item title
--   part_in_document = mandate-section heading ('Mandate and planning assumptions', ...)
--   pillar           = 'Peace & Security'   (constant for PKM)
--   budget_part      = 'Political affairs'   (constant for PKM)
--
-- Prerequisites:
--   1. UNSOH (new mission, est. SC res 2793 (2025)) is missing from
--      systemchart.entities; it is inserted below before the FK insert.
--      (UNLB has no resolution-based mandate, so it produces no citation
--      rows and needs no entity row.)
--   2. Requires \copy from CSV (run via psql).
--
-- No DDL/schema changes are required: ppb2026.source_documents,
-- ppb2026.source_document_citations and systemchart.entities already have
-- every column used here, so sql/schema/*.sql is unchanged.
--
-- Run with: psql $DATABASE_URL -f sql/migrations/008_import_pkm.sql

BEGIN;

-- 1. Register the new PKM budget cycle (mirrors the existing 'pko' row).
--    Newest cycle sorts first, so demote the 2025/26 entry.
UPDATE ppb2026.budget_documents SET sort_order = 3 WHERE slug = 'pko';

INSERT INTO ppb2026.budget_documents (slug, display_name, match_pattern, sort_order)
VALUES ('pko2627', 'Budget of Peacekeeping Operations 2026/27', '^PKM 26/27', 2)
ON CONFLICT (slug) DO UPDATE
SET display_name = EXCLUDED.display_name,
    match_pattern = EXCLUDED.match_pattern,
    sort_order = EXCLUDED.sort_order;

-- 2. Ensure all referenced missions exist in systemchart.entities.
--    UNSOH is the only new entity for this cycle.
INSERT INTO systemchart.entities (entity, entity_long)
VALUES ('UNSOH', 'United Nations Support Office in Haiti')
ON CONFLICT (entity) DO NOTHING;

-- 3. Temp staging table matching data/processed/pkm2026/all_mandates.csv
CREATE TEMP TABLE _pkm2627_staging (
    origin_document      TEXT,
    file                 TEXT,
    entity               TEXT,
    entity_long          TEXT,
    section              TEXT,
    section_title        TEXT,
    part_in_document     TEXT,
    description          TEXT,
    link                 TEXT,
    symbol               TEXT,
    full_document_symbol TEXT,
    source               TEXT
);

-- 4. Load CSV (header columns are Title Cased in the file)
\copy _pkm2627_staging FROM 'data/processed/pkm2026/all_mandates.csv' WITH (FORMAT csv, HEADER true);

-- 5. Safety: use symbol as full_document_symbol when the latter is empty
UPDATE _pkm2627_staging
SET full_document_symbol = symbol
WHERE full_document_symbol IS NULL OR full_document_symbol = '';

-- 6. Insert new source_documents (skip existing)
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
FROM _pkm2627_staging s
WHERE s.full_document_symbol IS NOT NULL
  AND s.full_document_symbol != ''
  AND NOT EXISTS (
      SELECT 1 FROM ppb2026.source_documents sd
      WHERE sd.ppb_full_document_symbol = s.full_document_symbol
  )
ON CONFLICT (ppb_full_document_symbol) DO NOTHING;

-- 7. Insert citations (pillar / budget_part are constant for PKM)
INSERT INTO ppb2026.source_document_citations (
    ppb_full_document_symbol,
    entity,
    origin_document,
    part_in_document,
    section,
    section_title,
    pillar,
    budget_part
)
SELECT
    s.full_document_symbol,
    s.entity,
    s.origin_document,
    s.part_in_document,
    s.section,
    s.section_title,
    'Peace & Security',
    'Political affairs'
FROM _pkm2627_staging s
WHERE s.full_document_symbol IS NOT NULL
  AND s.full_document_symbol != ''
ON CONFLICT DO NOTHING;

-- 8. Cleanup
DROP TABLE _pkm2627_staging;

COMMIT;
