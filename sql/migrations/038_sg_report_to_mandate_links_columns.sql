-- ===========================================================================
-- mandates.sg_report_to_mandate_links — column renames
-- role -> resolution_role, pinpoint -> resolution_pinpoint,
-- sense -> citation_sense; stored sense value
-- committee_established -> body_established.
--
-- The link table's short column names (role, sense, pinpoint) are unambiguous
-- inside the extractor but not at the read path: the website's TypeScript
-- data layer is about to consume this table, where bare `role` collides with
-- ARIA/Postgres role vocabulary and bare `sense`/`pinpoint` say nothing about
-- what they qualify. Renamed now, before any consumer exists, so the rename
-- never crosses a language boundary. The value rename completes the
-- body-agnostic `established` cue widening: the cue matches any established
-- body (Committee, Group, Panel, Commission), so the stored value no longer
-- names a Committee it never required.
--
-- Both tables are empty at application time and the table is single-owner
-- (delete-then-reinsert by the Stage 1 extractor), so no data migrates: this
-- is DDL only, no UPDATE.
-- ===========================================================================
ALTER TABLE mandates.sg_report_to_mandate_links
    RENAME COLUMN role TO resolution_role;
ALTER TABLE mandates.sg_report_to_mandate_links
    RENAME COLUMN pinpoint TO resolution_pinpoint;
ALTER TABLE mandates.sg_report_to_mandate_links
    RENAME COLUMN sense TO citation_sense;

-- Postgres rewrites a CHECK's expression on column rename but never renames
-- the constraint itself. Rename role's constraint (its value set is
-- unchanged) and drop-and-re-add sense's (its value set changes), so that a
-- migrated database and a fresh sql/schema/mandates.sql rebuild converge on
-- identical constraint names.
--
-- Both old constraint names below are INFERRED from Postgres's auto-naming
-- convention for the inline CHECKs created by 036 (<table>_<column>_check);
-- verify them against the live catalog (pg_constraint) before applying this
-- migration. Deliberately no IF EXISTS and no lookup: a wrong name must fail
-- loudly here, not be absorbed.
ALTER TABLE mandates.sg_report_to_mandate_links
    RENAME CONSTRAINT sg_report_to_mandate_links_role_check
    TO sg_report_to_mandate_links_resolution_role_check;
ALTER TABLE mandates.sg_report_to_mandate_links
    DROP CONSTRAINT sg_report_to_mandate_links_sense_check;
ALTER TABLE mandates.sg_report_to_mandate_links
    ADD CONSTRAINT sg_report_to_mandate_links_citation_sense_check
    CHECK (citation_sense IN ('direct_request', 'founding_renewal', 'additional_joint',
                              'activities_carried_out', 'body_established', 'prst_note_decision'));

-- Re-issue the one stored comment whose prose names the renamed column, so
-- the in-database documentation does not go stale against the schema file.
COMMENT ON COLUMN mandates.sg_report_to_mandate_links.resolution_canonical IS
  'The resolution cited in a report''s Digital Library notes as the one that mandated it — '
  'this is the whole point of the table. Almost always a General Assembly or Security Council '
  'resolution (e.g. A/RES/74/247, S/RES/2664). Occasionally a report cites a Security Council '
  'presidential statement (S/PRST/..) instead of a resolution. These are kept here too, in '
  'the same column, rather than thrown away — a deliberate choice to capture everything the '
  'notes cite. Strictly a presidential statement is not a resolution, so these rows are stored '
  'but never shown as resolution links (the display filters them out by their citation_sense value). '
  'The resolution_* naming reflects the common, displayed case, not every stored row.';
