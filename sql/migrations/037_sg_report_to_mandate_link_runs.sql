-- ===========================================================================
-- mandates.sg_report_to_mandate_link_runs
-- One row per run of the Stage 1 extractor that populates
-- sg_report_to_mandate_links (data-processing/report_mandate_links/).
--
-- The run record is the selection predicate's visibility mechanism: each
-- exclusion clause's removals are stored separately, because a clause that
-- silently excludes zero — or everything — is exactly the state that must
-- stay visible once link rows exist and nobody re-derives the selection.
-- Written in the same transaction as the run's scope-delete and inserts, so
-- the counts can never disagree with the table state they describe.
--
-- Dropped with the schema on rebuild. Unlike the link table it is NOT
-- restored by re-running the extractor: a rebuild starts run history afresh.
-- ===========================================================================
CREATE TABLE mandates.sg_report_to_mandate_link_runs (
    -- Ordinal identity, not uuid5: a run has no natural key (two byte-identical
    -- runs are still two runs), so there is nothing deterministic to mint from.
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ NOT NULL,
    selected_by_marc INTEGER NOT NULL,
    removed_null_symbol INTEGER NOT NULL,
    removed_corr_rev INTEGER NOT NULL,
    removed_deleted INTEGER NOT NULL,
    reports_parsed INTEGER NOT NULL,
    wider_marker_retained INTEGER NOT NULL,
    link_rows_written INTEGER NOT NULL,
    notes_unparsed INTEGER NOT NULL,
    -- Selection must reconcile exactly: every selected document is either
    -- removed by exactly one exclusion clause or parsed.
    CHECK (selected_by_marc
           = removed_null_symbol + removed_corr_rev + removed_deleted + reports_parsed)
);

COMMENT ON TABLE mandates.sg_report_to_mandate_link_runs IS
  'One row per run of the extractor that fills sg_report_to_mandate_links. Records how '
  'many documents the selection saw and what each exclusion removed, so the selection '
  'stays auditable as a set of numbers after the fact. Technical: written in the same '
  'transaction as the run''s delete+insert; the CHECK enforces that removals plus parsed '
  'reports reconcile exactly to the selected total.';

COMMENT ON COLUMN mandates.sg_report_to_mandate_link_runs.selected_by_marc IS
  'Documents matching the sole report-identity test (MARC 989$c = "Secretary-General''s '
  'Reports"). Doubles as the drift tripwire on that field: expected magnitude ~28,201 '
  '(measured 30 Jul 2026); a run where this moves sharply warrants a look before the '
  'links are trusted.';

COMMENT ON COLUMN mandates.sg_report_to_mandate_link_runs.removed_deleted IS
  'Soft-deleted documents (deleted_at set) removed from the selection. Measured zero on '
  '30 Jul 2026; recorded anyway so a future non-zero is a visible number rather than a '
  'silent shrink of the corpus.';

COMMENT ON COLUMN mandates.sg_report_to_mandate_link_runs.wider_marker_retained IS
  'Parsed-set documents whose folded symbol carries a corrigendum or revision marker in '
  'a form the exclusion deliberately does not catch: spelled-out CORRIGENDUM, or bare '
  'no-period CORR/REV. Addenda are not counted; they are in scope by design. Not an '
  'exclusion — a counted residual, so the gap is a known number.';
