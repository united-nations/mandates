-- Migration: align special political mission entity codes with the 2027 names.
--
-- Two continuing missions were renamed in the proposed programme budget for
-- 2027, and their old codes now name offices that no longer exist:
--
--   OSASG-Cyprus     "Office of the Special Adviser to the Secretary-General on
--                    Cyprus". The Special Adviser (USG-level) post was
--                    abolished; the mission is now the "Mission of the
--                    Secretary-General's Good Offices in Cyprus" and uses
--                    GOM-Cyprus as its own abbreviation (see
--                    uncyprustalks.unmissions.org).
--
--   OSESG-SCRES1559  "Office of the Special Envoy of the Secretary-General for
--                    the implementation of Security Council resolution 1559
--                    (2004)". The Special Envoy post ended in 2016 and the USG
--                    for Political and Peacebuilding Affairs has carried the
--                    reporting function since, which is why the 2027 budget
--                    presents it as "Support for the implementation of Security
--                    Council resolution 1559 (2004)". SC-RES1559 matches its
--                    sibling SC-RES2231 ("Implementation of Security Council
--                    resolution 2231 (2015)") -- and retires the only code that
--                    used the one-off "SCRES" infix.
--
-- The code is user-visible in the mandate explorer, so the missions are renamed
-- rather than aliased, and the PPB 2026 citations move with them: otherwise the
-- same mission would appear as two separate entities depending on which budget
-- version is selected.
--
-- source_document_citations.entity is FK'd to systemchart.entities ON UPDATE
-- CASCADE, so the 16 existing PPB 2026 citations (9 Cyprus, 7 res-1559) follow
-- the rename automatically. Verified that no other referencing table holds these
-- codes -- several un80actions/sg_reports_survey FKs have no ON UPDATE rule and
-- would otherwise block the update.
--
-- Run with: psql "$DATABASE_URL" -f sql/migrations/030_rename_spm_entities.sql

BEGIN;

-- 1. Rename the two superseded codes (citations cascade).
UPDATE systemchart.entities
SET entity = 'GOM-Cyprus',
    entity_long = 'Mission of the Secretary-General’s Good Offices in Cyprus'
WHERE entity = 'OSASG-Cyprus';

UPDATE systemchart.entities
SET entity = 'SC-RES1559',
    entity_long = 'Support for the implementation of Security Council resolution 1559 (2004)'
WHERE entity = 'OSESG-SCRES1559';

-- 2. Register the two missions that are genuinely new in 2027.
--
--    SR-RES2792 is the follow-on mechanism to UNAMI (whose mandate expired on
--    31 December 2025): the Senior Representative appointed under Security
--    Council resolution 2792 (2025) to pursue the return of Kuwaiti missing
--    persons and property, including the national archives. It has no official
--    abbreviation yet, so the code follows the established "-RES####" pattern
--    (OMBUD-RES1904, PoE-RES2713, PoE-RES2745).
--
--    PoE-Iran follows the PoE-<country> pattern used by every other panel.
--
--    Inserted here with curated long names so that the importer's
--    ON CONFLICT DO NOTHING never overwrites them with CSV wording.
INSERT INTO systemchart.entities (entity, entity_long)
VALUES
    ('SR-RES2792', 'Senior Representative for the implementation of Security Council resolution 2792 (2025)'),
    ('PoE-Iran',   'Panel of Experts on the Islamic Republic of Iran')
ON CONFLICT (entity) DO NOTHING;

COMMIT;
