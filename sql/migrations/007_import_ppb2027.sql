-- Migration: Import PPB 2027 mandate data from all_mandates.csv
-- Adds new source_documents and source_document_citations rows.
-- Existing PPB 2026 data is untouched; origin_document = 'PPB 2027' distinguishes.
--
-- Prerequisites:
--   1. Fix entity mismatch: CSV uses 'UN-Women', DB has 'UN Women'
--   2. Requires COPY from CSV or equivalent loader
--
-- Run with: psql $DATABASE_URL -f sql/migrations/007_import_ppb2027.sql

BEGIN;

-- 1. Add budget_documents entry for PPB 2027
INSERT INTO ppb2026.budget_documents (slug, display_name, match_pattern, sort_order)
VALUES ('ppb2027', 'Proposed Programme Budget for 2027', '^PPB 2027$', 0)
ON CONFLICT (slug) DO UPDATE
SET display_name = EXCLUDED.display_name,
    match_pattern = EXCLUDED.match_pattern,
    sort_order = EXCLUDED.sort_order;

-- 2. Create temp staging table for CSV import
CREATE TEMP TABLE _ppb2027_staging (
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

-- 3. Load CSV (run \copy in psql or use COPY with superuser)
\copy _ppb2027_staging FROM 'data/processed/ppb2027/all_mandates.csv' WITH (FORMAT csv, HEADER true);

-- 4. Normalize entity name: UN-Women → UN Women
UPDATE _ppb2027_staging SET entity = 'UN Women' WHERE entity = 'UN-Women';

-- 5. Use symbol as full_document_symbol when full_document_symbol is empty
UPDATE _ppb2027_staging
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
FROM _ppb2027_staging s
WHERE s.full_document_symbol IS NOT NULL
  AND s.full_document_symbol != ''
  AND NOT EXISTS (
      SELECT 1 FROM ppb2026.source_documents sd
      WHERE sd.ppb_full_document_symbol = s.full_document_symbol
  )
ON CONFLICT (ppb_full_document_symbol) DO NOTHING;

-- 7. Insert citations
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
FROM _ppb2027_staging s
WHERE s.full_document_symbol IS NOT NULL
  AND s.full_document_symbol != ''
ON CONFLICT DO NOTHING;

-- 8. Cleanup
DROP TABLE _ppb2027_staging;

COMMIT;
