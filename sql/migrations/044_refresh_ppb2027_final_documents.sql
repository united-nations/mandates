-- Replace preliminary PPB 2027 Section 1 and Section 3/Add.1-4 citations
-- with the final-document export, including the two reviewed link corrections
-- in data/references/ppb_citation_link_corrections.csv.
--
-- Run FROM THE REPOSITORY ROOT with a write-capable role that can also refresh
-- public.unified_documents (normally the database owner):
--   psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 \
--     -f sql/migrations/044_refresh_ppb2027_final_documents.sql
--
-- Requires the updated data/processed/ppb2027/all_mandates_resolved.csv.
-- The export has 466 affected occurrence rows and 415 database citation keys:
--   Section 1: 230; Add.1: 0; Add.2: 77; Add.3: 65; Add.4: 43.
-- Repeated passages collapse through the existing citation natural key.
--
-- Preserves UNSDG-SWEO, the identifier already used by this budget cycle.
-- Existing source-document metadata and all other budgets/sections are retained.
-- As in migrations 022/033, affected citation IDs are regenerated. No tables
-- reference those IDs; document/entity identities remain unchanged.
-- Import and materialized-view refresh commit together. Any error rolls back
-- the complete update. This migration may be rerun with the same export.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '5min';

CREATE TEMP TABLE _ppb2027_final_staging (
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
) ON COMMIT DROP;

\copy _ppb2027_final_staging FROM 'data/processed/ppb2027/all_mandates_resolved.csv' WITH (FORMAT csv, HEADER true);

DELETE FROM _ppb2027_final_staging
WHERE origin_document IS DISTINCT FROM 'PPB 2027'
   OR (section = '1' OR (section = '3' AND addendum IN ('1', '2', '3', '4'))) IS NOT TRUE;

DO $input_guard$
BEGIN
    IF (SELECT count(*) FROM _ppb2027_final_staging) <> 466
       OR (SELECT count(*) FROM _ppb2027_final_staging WHERE section = '1') <> 241
       OR (SELECT count(*) FROM _ppb2027_final_staging WHERE addendum = '2') <> 99
       OR (SELECT count(*) FROM _ppb2027_final_staging WHERE addendum = '3') <> 75
       OR (SELECT count(*) FROM _ppb2027_final_staging WHERE addendum = '4') <> 51
    THEN
        RAISE EXCEPTION 'Unexpected export: expected final-document occurrence counts 241/0/99/75/51';
    END IF;
    IF EXISTS (
        SELECT 1 FROM _ppb2027_final_staging
        WHERE file NOT IN (
            'A_81_6 (SECT. 1).json',
            'A_81_6 (SECT. 3)_ADD.2.json',
            'A_81_6 (SECT. 3)_ADD.3.json',
            'A_81_6 (SECT. 3)_ADD.4.json'
        )
        OR nullif(full_document_symbol, '') IS NULL
        OR full_document_symbol ~ '^[0-9]+/[0-9]+$'
        OR full_document_symbol IN ('A/HRC/RES/77/318', 'A/74/73-/E/2019/14')
    ) THEN
        RAISE EXCEPTION 'Export contains preliminary, unresolved, or uncorrected citations';
    END IF;
END
$input_guard$;

UPDATE _ppb2027_final_staging
SET entity = 'UNSDG-SWEO'
WHERE entity = 'SWEO' AND section = '1';

DO $entity_guard$
BEGIN
    IF EXISTS (
        SELECT 1 FROM _ppb2027_final_staging s
        LEFT JOIN systemchart.entities e ON e.entity = s.entity
        WHERE e.entity IS NULL
    ) THEN
        RAISE EXCEPTION 'Export contains an unknown entity; no entities will be created automatically';
    END IF;
END
$entity_guard$;

-- Register missing documents; retain metadata/full texts of existing documents.
INSERT INTO ppb2026.source_documents (
    ppb_full_document_symbol, ppb_document_source, ppb_description,
    ppb_symbol, ppb_link, ppb_body, ppb_not_ods, ppb_full_doc_symbol_available
)
SELECT DISTINCT ON (full_document_symbol)
    full_document_symbol, nullif(source, ''), nullif(description, ''),
    symbol, nullif(link, ''), nullif(organ, ''),
    CASE WHEN full_document_symbol ~ '^(A|S|E|ST|UNEP|HSP|WT|ECE|CAC|CTOC|CD|TD|ESCAP)/[^[:space:]]+$'
         THEN 'false' ELSE 'true' END,
    CASE WHEN full_document_symbol ~ '^(A|S|E|ST|UNEP|HSP|WT|ECE|CAC|CTOC|CD|TD|ESCAP)/[^[:space:]]+$'
         THEN 'TRUE' ELSE 'IN REPORT' END
FROM _ppb2027_final_staging
ORDER BY full_document_symbol, nullif(description, '') NULLS LAST, symbol, link
ON CONFLICT (ppb_full_document_symbol) DO NOTHING;

DELETE FROM ppb2026.source_document_citations
WHERE origin_document = 'PPB 2027'
  AND section IN ('1', '3 (Add.1)', '3 (Add.2)', '3 (Add.3)', '3 (Add.4)');

INSERT INTO ppb2026.source_document_citations (
    ppb_full_document_symbol, entity, origin_document, part_in_document,
    section, section_title, budget_part, budget_part_number,
    programme, programme_title, sub_programme
)
SELECT DISTINCT
    full_document_symbol, entity, origin_document, part_in_document,
    CASE WHEN section = '3' THEN '3 (Add.' || addendum || ')' ELSE section END,
    section_title, part_title, part,
    CASE WHEN programme ~ '^\d+(\.\d+)?$' THEN programme::numeric::smallint ELSE NULL END,
    nullif(programme_title, ''),
    CASE WHEN nullif(subprogramme, '') IS NOT NULL
         THEN 'Subprogramme ' || subprogramme ||
              CASE WHEN nullif(subprogramme_title, '') IS NOT NULL
                   THEN '. ' || subprogramme_title ELSE '' END
         ELSE NULL END
FROM _ppb2027_final_staging
ON CONFLICT DO NOTHING;

DO $result_guard$
DECLARE
    actual JSONB;
BEGIN
    SELECT jsonb_object_agg(section, n) INTO actual
    FROM (
        SELECT section, count(*) AS n
        FROM ppb2026.source_document_citations
        WHERE origin_document = 'PPB 2027'
          AND section IN ('1', '3 (Add.1)', '3 (Add.2)', '3 (Add.3)', '3 (Add.4)')
        GROUP BY section
    ) counts;
    IF actual IS DISTINCT FROM '{"1":230,"3 (Add.2)":77,"3 (Add.3)":65,"3 (Add.4)":43}'::jsonb THEN
        RAISE EXCEPTION 'Unexpected imported citation counts: %', actual;
    END IF;
END
$result_guard$;

REFRESH MATERIALIZED VIEW public.unified_documents;

SELECT section, count(*) AS citations, count(DISTINCT entity) AS entities
FROM ppb2026.source_document_citations
WHERE origin_document = 'PPB 2027'
  AND section IN ('1', '3 (Add.1)', '3 (Add.2)', '3 (Add.3)', '3 (Add.4)')
GROUP BY section
ORDER BY section;

COMMIT;
