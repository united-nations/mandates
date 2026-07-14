-- Migration: Normalize the programme budget hierarchy
--            (Part → Section → Programme → Subprogramme → Entity)
--
-- Background
-- ----------
-- The hierarchy has only ever existed as denormalized text on
-- ppb2026.source_document_citations, and it was incomplete:
--
--   * budget_part is NULL for every PPB 2027 row. The 2027 pipeline does
--     produce the part (as a roman numeral), and 007_import_ppb2027.sql even
--     declares `part` in its staging table — but the INSERT never wrote it.
--   * budget_part has only ever held the part *title*; the roman numeral is
--     recorded nowhere, so parts cannot be ordered or joined across years.
--   * PPB 2026 titles come from the Airtable curation and read "International
--     cooperation *and* development"; the official fascicle titles say "for".
--
-- The section → part grouping was verified to be identical in both years
-- (PPB 2026 via the Airtable master export, PPB 2027 via the fascicle
-- frontmatter), so the part is fully derivable from the section and the
-- 2027 gap can be closed without re-importing anything.
--
-- Part titles below are the official ones as printed in the A/81/6 fascicles.
--
-- Run with: psql $DATABASE_URL -f sql/migrations/021_budget_hierarchy.sql

BEGIN;

-- 1. Canonical parts. Ordered by roman numeral; the title is the label.
CREATE TABLE IF NOT EXISTS ppb2026.budget_parts (
    part_number TEXT PRIMARY KEY,
    part_title  TEXT NOT NULL,
    sort_order  SMALLINT NOT NULL
);

INSERT INTO ppb2026.budget_parts (part_number, part_title, sort_order) VALUES
    ('I',    'Overall policymaking, direction and coordination',                 1),
    ('II',   'Political affairs',                                                2),
    ('III',  'International justice and law',                                    3),
    ('IV',   'International cooperation for development',                        4),
    ('V',    'Regional cooperation for development',                             5),
    ('VI',   'Human rights and humanitarian affairs',                            6),
    ('VII',  'Global communications',                                            7),
    ('VIII', 'Common support services',                                          8),
    ('IX',   'Internal oversight',                                               9),
    ('X',    'Jointly financed administrative activities and special expenses', 10),
    -- Part XI (capital expenditures) carries no mandate citations in either year.
    ('XII',  'Safety and security',                                             12),
    ('XIII', 'Development Account',                                             13)
ON CONFLICT (part_number) DO UPDATE
SET part_title = EXCLUDED.part_title,
    sort_order = EXCLUDED.sort_order;

-- 2. Canonical sections, each belonging to exactly one part. Covers every
--    section observed in PPB 2026 and PPB 2027. Section 7 appears in 2026
--    only; sections 1 and 35 in 2027 are pending (Section 1 extraction is
--    still in progress), which is why this list is keyed on the section, not
--    on the rows that happen to exist today.
CREATE TABLE IF NOT EXISTS ppb2026.budget_sections (
    section     TEXT PRIMARY KEY,
    part_number TEXT NOT NULL REFERENCES ppb2026.budget_parts(part_number),
    sort_order  SMALLINT NOT NULL
);

INSERT INTO ppb2026.budget_sections (section, part_number, sort_order) VALUES
    ('1',   'I',     1), ('2',   'I',     2),
    ('3',   'II',    3), ('4',   'II',    4), ('5',   'II',    5), ('6',  'II',   6),
    ('7',   'III',   7), ('8',   'III',   8),
    ('9',   'IV',    9), ('10',  'IV',   10), ('11',  'IV',   11), ('12', 'IV',  12),
    ('13',  'IV',   13), ('14',  'IV',   14), ('15',  'IV',   15), ('16', 'IV',  16),
    ('17',  'IV',   17),
    ('18',  'V',    18), ('19',  'V',    19), ('20',  'V',    20), ('21', 'V',   21),
    ('22',  'V',    22),
    ('24',  'VI',   24), ('25',  'VI',   25), ('26',  'VI',   26), ('27', 'VI',  27),
    ('28',  'VII',  28),
    ('29A', 'VIII', 29), ('29B', 'VIII', 30), ('29C', 'VIII', 31),
    ('29D', 'VIII', 32), ('29E', 'VIII', 33), ('29F', 'VIII', 34),
    ('30',  'IX',   35),
    ('31',  'X',    36),
    ('34',  'XII',  37),
    ('35',  'XIII', 38)
ON CONFLICT (section) DO UPDATE
SET part_number = EXCLUDED.part_number,
    sort_order  = EXCLUDED.sort_order;

-- 3. Give citations a part reference and a sortable subprogramme number.
--    sub_programme itself stays as-is ("Subprogramme 3. Sustainable
--    development", "All Subprogrammes") — it is the display label.
ALTER TABLE ppb2026.source_document_citations
    ADD COLUMN IF NOT EXISTS budget_part_number TEXT
        REFERENCES ppb2026.budget_parts(part_number);

ALTER TABLE ppb2026.source_document_citations
    ADD COLUMN IF NOT EXISTS sub_programme_number SMALLINT
        GENERATED ALWAYS AS (
            NULLIF(substring(sub_programme FROM '^Subprogramme\s+(\d+)'), '')::SMALLINT
        ) STORED;

-- 4. Backfill the part for every PPB citation from its section. Sections carry
--    addendum suffixes on some PPB 2026 rows ("3 (Add.2)") — strip them first.
--    PKM and Plan Outline rows are deliberately untouched: peacekeeping
--    missions and the plan outline sit outside the regular-budget part
--    structure, and their `section` means something else entirely ("Add.1").
UPDATE ppb2026.source_document_citations c
SET budget_part_number = s.part_number
FROM ppb2026.budget_sections s
WHERE c.origin_document LIKE 'PPB %'
  AND s.section = regexp_replace(c.section, '\s*\(Add\..*\)$', '')
  AND c.budget_part_number IS DISTINCT FROM s.part_number;

-- 5. Fill the legacy title column where it is missing (all of PPB 2027), so
--    consumers that still read budget_part directly see a value. Existing
--    PPB 2026 titles are left alone; ppb2026.budget_parts is the canonical
--    source for display and should be joined via budget_part_number.
UPDATE ppb2026.source_document_citations c
SET budget_part = p.part_title
FROM ppb2026.budget_parts p
WHERE c.budget_part IS NULL
  AND c.budget_part_number = p.part_number;

CREATE INDEX IF NOT EXISTS ix_citations_budget_part_number
    ON ppb2026.source_document_citations (budget_part_number);

CREATE INDEX IF NOT EXISTS ix_citations_section
    ON ppb2026.source_document_citations (section);

COMMIT;
