-- ===========================================================================
-- mandates.sg_report_to_mandate_links
-- SG-report -> mandating-resolution citation links, extracted from
-- digitallibrary.documents.notes by data-processing/report_mandate_links/.
--
-- Grain: one row per citation OCCURRENCE within a note element. The
-- one-row-per-(report, resolution) shape is the DISPLAY grain, derived at read
-- time. Nothing coverage-derived is stored (pending_coverage, completeness, and
-- displayable counts are all computed at read time).
--
-- Single-owner table: written only by the Stage 1 extractor, whose write path
-- deletes all rows for a report_recid then inserts (source-change convergence).
-- Dropped with the schema on rebuild (this file's DROP SCHEMA ... CASCADE);
-- restored by re-running the extractor.
-- ===========================================================================
CREATE TABLE mandates.sg_report_to_mandate_links (
    -- Deterministic uuid5(NAMESPACE_URL,
    --   "<report_recid>:<note_index>:<resolution_canonical>:<note_span_start>"),
    -- minted at the write edge, same strategy as paragraphs.id.
    -- Do NOT use gen_random_uuid() here.
    id UUID PRIMARY KEY,
    report_recid INTEGER NOT NULL,
    report_symbol TEXT NOT NULL,
    note_index INTEGER NOT NULL,
    note_span_start INTEGER NOT NULL,
    note_span_end INTEGER NOT NULL,
    resolution_canonical TEXT NOT NULL,
    resolution_match_key TEXT NOT NULL,
    resolution_display_candidates TEXT[] NOT NULL,
    role TEXT NOT NULL
        CHECK (role IN ('founding', 'most_recent', 'co_equal', 'establishing', 'additional')),
    sense TEXT NOT NULL
        CHECK (sense IN ('direct_request', 'founding_renewal', 'additional_joint',
                         'activities_carried_out', 'committee_established', 'prst_note_decision')),
    organ_provenance TEXT NOT NULL
        CHECK (organ_provenance IN ('stated', 'inherited', 'intrinsic')),
    pinpoint TEXT,
    source_note_text TEXT NOT NULL,
    UNIQUE (report_recid, note_index, resolution_canonical, note_span_start)
);

CREATE INDEX idx_sg_report_to_mandate_links_match_key
    ON mandates.sg_report_to_mandate_links (resolution_match_key);
CREATE INDEX idx_sg_report_to_mandate_links_recid
    ON mandates.sg_report_to_mandate_links (report_recid);

COMMENT ON TABLE mandates.sg_report_to_mandate_links IS
  'Links Secretary-General reports to the resolutions that mandated them. Each row records '
  'that one SG report cited one resolution in its Digital Library notes ("submitted pursuant '
  'to resolution X"), so the resolution''s page can list the reports produced under it. '
  'Technical: one row per citation occurrence within a note element (the '
  'one-row-per-report-resolution view is derived at read time). Written only by the Stage 1 '
  'extractor (data-processing/report_mandate_links/), which deletes and reinserts all rows '
  'for a report on each run. Nothing coverage-derived is stored.';

COMMENT ON COLUMN mandates.sg_report_to_mandate_links.resolution_canonical IS
  'The resolution cited in a report''s Digital Library notes as the one that mandated it — '
  'this is the whole point of the table. Almost always a General Assembly or Security Council '
  'resolution (e.g. A/RES/74/247, S/RES/2664). Occasionally a report cites a Security Council '
  'presidential statement (S/PRST/..) instead of a resolution. These are kept here too, in '
  'the same column, rather than thrown away — a deliberate choice to capture everything the '
  'notes cite. Strictly a presidential statement is not a resolution, so these rows are stored '
  'but never shown as resolution links (the display filters them out by their sense value). '
  'The resolution_* naming reflects the common, displayed case, not every stored row.';

COMMENT ON COLUMN mandates.sg_report_to_mandate_links.resolution_match_key IS
  'The same cited resolution, reduced to the form used for matching it to a page in the '
  'mandate registry. Differs from resolution_canonical only in edge cases where the cited '
  'form and the registry''s form need normalising to line up; usually identical.';

COMMENT ON COLUMN mandates.sg_report_to_mandate_links.resolution_display_candidates IS
  'Every registry page-symbol this resolution could be shown under, as an array. An empty '
  'array ({}) means no page exists for it yet — this is a real, expected state, NOT missing '
  'data and never NULL. Which candidate actually renders is chosen at read time.';
