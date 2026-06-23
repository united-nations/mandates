-- Migration: Top up PKM 26/27 cycle with the four UNGSC Brindisi (UNLB)
-- mandate citations. The ACABQ peacekeeping budget addendum A/80/604/Add.5
-- discusses UNLB but does not cite the underlying GA mandate resolutions
-- in its Mandate subsection (it only cross-references SG/ACABQ documents),
-- so the auto-extracted PKM pipeline produces no citations for this entity.
--
-- These four resolutions are hand-curated from the SG report A/80/605,
-- mirroring the supplement file
-- data/references/peacekeeping_mission_mandates.csv that the pipeline
-- appends in _load_pkm_supplement(). Migration 009 (the original PKM 26/27
-- importer) ran before that supplement existed, so this migration backfills
-- the four missing rows.
--
-- No new entity row is needed: the Brindisi base has lived in
-- systemchart.entities as 'UNGSC Brindisi' (United Nations Logistics Base
-- at Brindisi, Italy) since the 2025/26 cycle. The 2026/27 ACABQ data
-- previously referred to it as 'UNLB'; both pipeline files now use the
-- existing 'UNGSC Brindisi' short name for consistency.
--
-- Idempotent: ON CONFLICT DO NOTHING on both tables means re-running this
-- migration is a no-op.
--
-- Run with: psql $DATABASE_URL -f sql/migrations/018_import_pkm_ungsc_brindisi.sql

BEGIN;

-- 1. Source documents - two are already present (A/RES/63/262 from the
--    prior PKM cycle; A/RES/72/266B from PPB 2027). The other two
--    (A/RES/49/233A and A/RES/78/295) are new.
INSERT INTO ppb2026.source_documents (
    ppb_full_document_symbol,
    ppb_document_source,
    ppb_description,
    ppb_symbol,
    ppb_link
)
VALUES
    ('A/RES/49/233A', 'General Assembly resolutions',
     'In its resolution 49/233 A of 23 December 1994, the General Assembly welcomed the establishment of the first permanent United Nations logistics base in Brindisi, Italy, to support peacekeeping operations.',
     '49/233 A', 'https://docs.un.org/en/A/RES/49/233A'),
    ('A/RES/63/262', 'General Assembly resolutions',
     'In its resolution 63/262 of 24 December 2008, the General Assembly approved the establishment of site B, in Valencia, Spain, as a secondary active telecommunications and information technology facility.',
     '63/262', 'https://docs.un.org/en/A/RES/63/262'),
    ('A/RES/72/266B', 'General Assembly resolutions',
     'UNLB is mandated to serve all field missions, Secretariat entities and United Nations system entities, pursuant to General Assembly resolution 72/266 B on shifting the management paradigm in the United Nations.',
     '72/266 B', 'https://docs.un.org/en/A/RES/72/266B'),
    ('A/RES/78/295', 'General Assembly resolutions',
     'In its resolution 78/295, the General Assembly endorsed the Advisory Committee''s recommendations on the implementation of the management paradigm shift at UNLB.',
     '78/295', 'https://docs.un.org/en/A/RES/78/295')
ON CONFLICT (ppb_full_document_symbol) DO NOTHING;

-- 2. Citations linking UNGSC Brindisi to these four resolutions.
--    origin_document points at the SG report A/80/605 (the actual source
--    of the citations), not the ACABQ doc A/80/604/Add.5 (which omits
--    them). pillar/budget_part follow the same constants migration 009
--    uses for all PKM rows.
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
VALUES
    ('A/RES/49/233A', 'UNGSC Brindisi', 'PKM 26/27 (A/80/605)', 'Mandate',
     NULL, 'Administrative and budgetary aspects of the financing of the United Nations peacekeeping operations',
     'Peace & Security', 'Political affairs'),
    ('A/RES/63/262',  'UNGSC Brindisi', 'PKM 26/27 (A/80/605)', 'Mandate',
     NULL, 'Administrative and budgetary aspects of the financing of the United Nations peacekeeping operations',
     'Peace & Security', 'Political affairs'),
    ('A/RES/72/266B', 'UNGSC Brindisi', 'PKM 26/27 (A/80/605)', 'Mandate',
     NULL, 'Administrative and budgetary aspects of the financing of the United Nations peacekeeping operations',
     'Peace & Security', 'Political affairs'),
    ('A/RES/78/295',  'UNGSC Brindisi', 'PKM 26/27 (A/80/605)', 'Mandate',
     NULL, 'Administrative and budgetary aspects of the financing of the United Nations peacekeeping operations',
     'Peace & Security', 'Political affairs')
ON CONFLICT DO NOTHING;

COMMIT;
