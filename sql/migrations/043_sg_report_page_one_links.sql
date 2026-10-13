-- ===========================================================================
-- 043: page-one report-to-mandate links.
--
-- A second source for the links Stage 1 draws from Digital Library notes
-- (sg_report_to_mandate_links, migrations 036-038): what the report itself
-- says, on its first pages, it is submitted under ("The present report is
-- submitted pursuant to General Assembly resolution 79/1 ..."). The page-one
-- extractor reads each report's Word (DOCX) rendition, checks the sentence
-- against the issued PDF, and gives every report in its population exactly
-- one outcome: linked, with the instruments it names, or refused, with one
-- reason from a closed list and the evidence it read.
--
-- Four tables and two views:
--   sg_report_page_one_runs              one row per run (provenance, counts)
--   sg_report_page_one_run_acceptances   which run the display may read
--   sg_report_page_one_outcomes          one row per report per run
--   sg_report_page_one_links             one row per citation of a linked report
--   sg_report_page_one_vs_stage1_keys    every run against Stage 1, per match key
--   sg_report_page_one_vs_stage1         accepted run against Stage 1, per report
--
-- The database refuses a run made from a package tree with uncommitted
-- changes, and a run made without the registry page-symbol lookup: neither
-- can be reproduced or displayed as it stands.
--
-- Rows are kept per run, never replaced. A later extractor version, or the
-- same version over a larger population, is a new run beside the old one, so
-- two runs compare by a join and any past state can be re-read. Nothing is
-- visible to a display by being written: the display reads the run named by
-- the latest acceptance, and an acceptance is a separate, dated row written
-- by an administrator after the run has been audited.
--
-- Append-only by grant: the writer role gets INSERT on runs, outcomes and
-- links, SELECT on runs.run_id alone (so it can read back the id the
-- database assigned its run), and nothing else: no other SELECT, no UPDATE,
-- DELETE or TRUNCATE, and no privilege at all on acceptances.
--
-- No character offsets are stored anywhere. statement_text is a verbatim copy
-- of the sentence, kept for audit queries and not rendered: a stored copy
-- does not tie the database to how the extractor turns a DOCX into text,
-- whereas offsets into that text would.
--
-- APPLYING
--   1. 043_sg_report_page_one_link_pipeline_role.sql, once, with a real
--      password (creates mandates_page_one_link_pipeline).
--   2. This file, as an administrator role that can create in schema
--      mandates and can read mandates.sg_report_to_mandate_links, inside a
--      transaction the operator opens and commits. No BEGIN/COMMIT here, so
--      the operator's transaction is not committed early.
-- Not re-runnable: the entry assertion stops a second application.
-- ===========================================================================

-- Entry assertion. Fails loudly if any object already exists, if a role this
-- migration grants to is missing, or if the applying role lacks what the
-- objects below need (a view's base-table privileges are checked when it is
-- read, not when it is created, so a missing one would otherwise surface
-- only on the first read).
DO $$
DECLARE
    object_name text;
BEGIN
    FOREACH object_name IN ARRAY ARRAY[
        'mandates.sg_report_page_one_runs',
        'mandates.sg_report_page_one_run_acceptances',
        'mandates.sg_report_page_one_outcomes',
        'mandates.sg_report_page_one_links',
        'mandates.sg_report_page_one_vs_stage1_keys',
        'mandates.sg_report_page_one_vs_stage1'
    ] LOOP
        IF to_regclass(object_name) IS NOT NULL THEN
            RAISE EXCEPTION '% already exists; this migration has been applied', object_name;
        END IF;
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'mandates_page_one_link_pipeline') THEN
        RAISE EXCEPTION 'Required role mandates_page_one_link_pipeline is missing; run the 043 role script first';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'mandates_readonly') THEN
        RAISE EXCEPTION 'Required existing role mandates_readonly is missing';
    END IF;
    IF to_regclass('mandates.sg_report_to_mandate_links') IS NULL THEN
        RAISE EXCEPTION 'Required existing table mandates.sg_report_to_mandate_links is missing';
    END IF;
    IF NOT has_schema_privilege('mandates', 'CREATE') THEN
        RAISE EXCEPTION 'Role % cannot create in schema mandates', current_user;
    END IF;
    IF NOT has_table_privilege('mandates.sg_report_to_mandate_links', 'SELECT') THEN
        RAISE EXCEPTION 'Role % cannot read mandates.sg_report_to_mandate_links, which the views read', current_user;
    END IF;
END
$$;

-- ===========================================================================
-- mandates.sg_report_page_one_runs
-- ===========================================================================
CREATE TABLE mandates.sg_report_page_one_runs (
    -- Ordinal identity, as for sg_report_to_mandate_link_runs: a run has no
    -- natural key (two byte-identical runs are still two runs).
    run_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_kind TEXT NOT NULL
        CHECK (run_kind IN ('extractor_run_jsonl')),
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ NOT NULL,
    extractor_version TEXT NOT NULL,
    extractor_tree_hash TEXT NOT NULL,
    -- A run from a tree with uncommitted changes is refused.
    tree_dirty BOOLEAN NOT NULL
        CHECK (tree_dirty = false),
    cue_vocabulary_sha256 TEXT NOT NULL,
    input_manifest_sha256 TEXT NOT NULL,
    input_manifest_label TEXT NOT NULL,
    acquisition_disposition_export_sha256 TEXT NOT NULL,
    acquisition_disposition_export_label TEXT NOT NULL,
    display_lookup_sha256 TEXT NOT NULL,
    display_lookup_label TEXT NOT NULL,
    -- A run without the registry page-symbol lookup is refused.
    display_candidates TEXT NOT NULL
        CHECK (display_candidates = 'looked_up'),
    population_description TEXT NOT NULL,
    run_host_label TEXT NOT NULL,
    reports_in_population INTEGER NOT NULL,
    reports_linked INTEGER NOT NULL,
    reports_refused INTEGER NOT NULL,
    link_rows_written INTEGER NOT NULL,
    output_rows_sha256 TEXT NOT NULL,
    docx_structure_unmodelled_recids INTEGER[] NOT NULL,
    runtime_versions JSONB NOT NULL,
    -- Every report in the population has exactly one outcome, linked or refused.
    CONSTRAINT sg_report_page_one_runs_population_reconciles
        CHECK (reports_in_population = reports_linked + reports_refused)
);

-- ===========================================================================
-- mandates.sg_report_page_one_run_acceptances
-- ===========================================================================
CREATE TABLE mandates.sg_report_page_one_run_acceptances (
    acceptance_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_id BIGINT NOT NULL REFERENCES mandates.sg_report_page_one_runs (run_id),
    accepted_at TIMESTAMPTZ NOT NULL,
    accepted_by_role TEXT NOT NULL,
    acceptance_basis TEXT NOT NULL
);

-- ===========================================================================
-- mandates.sg_report_page_one_outcomes
-- ===========================================================================
CREATE TABLE mandates.sg_report_page_one_outcomes (
    run_id BIGINT NOT NULL REFERENCES mandates.sg_report_page_one_runs (run_id),
    report_recid INTEGER NOT NULL,
    report_symbols TEXT[] NOT NULL,
    outcome TEXT NOT NULL
        CHECK (outcome IN ('linked', 'refused')),
    refusal_stage TEXT,
    refusal_reason TEXT,
    refusal_evidence JSONB,
    partial_refusals TEXT[] NOT NULL,
    acquisition_docx_dispositions TEXT[],
    rendition_sha256 TEXT,
    rendition_source_system TEXT
        CHECK (rendition_source_system IN ('ods')),
    rendition_format TEXT
        CHECK (rendition_format IN ('docx')),
    issued_pdf_check TEXT
        CHECK (issued_pdf_check IN ('statement_found', 'statement_not_found', 'no_pdf_held')),
    statements_found INTEGER NOT NULL,
    PRIMARY KEY (run_id, report_recid),
    -- A refusal's stage, reason and evidence are NULL exactly when the report is linked.
    CONSTRAINT sg_report_page_one_outcomes_refusal_when_refused
        CHECK ((outcome = 'linked') = (refusal_stage IS NULL)
               AND (outcome = 'linked') = (refusal_reason IS NULL)
               AND (outcome = 'linked') = (refusal_evidence IS NULL)),
    -- The closed refusal vocabulary: each reason belongs to exactly one stage.
    CONSTRAINT sg_report_page_one_outcomes_refusal_vocabulary
        CHECK (refusal_reason IS NULL OR (refusal_stage, refusal_reason) IN (
            ('rendition',  'no_rendition_held'),
            ('rendition',  'no_docx_rendition_held'),
            ('document',   'corrigendum_document'),
            ('document',   'docx_structure_unmodelled'),
            ('statement',  'no_statement_in_front_matter'),
            ('statement',  'title_names_resolution_without_statement'),
            ('statement',  'statement_refers_back_to_earlier_request'),
            ('statement',  'statement_subject_is_named_report'),
            ('statement',  'statement_symbol_only_in_footnote'),
            ('statement',  'statement_cites_no_instrument'),
            ('statement',  'statement_relation_unrecognised'),
            ('statement',  'box_and_prose_disagree'),
            ('citation',   'citation_organ_not_stated'),
            ('citation',   'citation_token_unrecognised'),
            ('citation',   'prose_and_link_disagree'),
            ('issued_pdf', 'statement_not_in_issued_pdf'))),
    -- A report refused at the rendition stage has no DOCX, so no rendition
    -- columns, and carries its acquisition dispositions instead; every other
    -- report has a DOCX and no dispositions.
    CONSTRAINT sg_report_page_one_outcomes_rendition_when_held
        CHECK ((refusal_stage IS NOT DISTINCT FROM 'rendition') = (rendition_sha256 IS NULL)
               AND (refusal_stage IS NOT DISTINCT FROM 'rendition') = (rendition_source_system IS NULL)
               AND (refusal_stage IS NOT DISTINCT FROM 'rendition') = (rendition_format IS NULL)
               AND (refusal_stage IS NOT DISTINCT FROM 'rendition') = (acquisition_docx_dispositions IS NOT NULL)),
    -- The issued-PDF check has a value exactly when there was a statement to check.
    CONSTRAINT sg_report_page_one_outcomes_pdf_check_when_statements
        CHECK ((issued_pdf_check IS NULL) = (statements_found = 0))
);

-- ===========================================================================
-- mandates.sg_report_page_one_links
-- ===========================================================================
CREATE TABLE mandates.sg_report_page_one_links (
    run_id BIGINT NOT NULL,
    report_recid INTEGER NOT NULL,
    statement_ordinal INTEGER NOT NULL,
    citation_ordinal INTEGER NOT NULL,
    statement_region TEXT NOT NULL
        CHECK (statement_region IN ('mandate_source_box', 'title_footnote', 'summary', 'first_section')),
    statement_paragraph_label TEXT,
    statement_form TEXT NOT NULL
        CHECK (statement_form IN ('mandate_source_box', 'predicate', 'predicate_ordinal',
                                  'predicate_bare_summary', 'participial', 'fronted',
                                  'activities', 'trailing', 'responds_to_request', 'mandated')),
    relation_phrase TEXT,
    statement_text TEXT NOT NULL,
    citation_role TEXT NOT NULL
        CHECK (citation_role IN ('mandating', 'mandating_founding', 'mandating_most_recent',
                                 'additional', 'context')),
    instrument_kind TEXT NOT NULL
        CHECK (instrument_kind IN ('resolution', 'decision', 'presidential_statement')),
    organ_provenance TEXT NOT NULL
        CHECK (organ_provenance IN ('stated', 'inherited', 'relative_clause', 'intrinsic', 'canonical')),
    cited_prose TEXT NOT NULL,
    cited_canonical TEXT NOT NULL,
    cited_match_key TEXT NOT NULL,
    cited_display_candidates TEXT[] NOT NULL,
    target_part_kind TEXT NOT NULL
        CHECK (target_part_kind IN ('whole', 'paragraph', 'paragraphs', 'section',
                                    'section_paragraph', 'annex', 'annex_paragraph')),
    target_part_text TEXT,
    open_ended_tail TEXT,
    hyperlink_target TEXT,
    PRIMARY KEY (run_id, report_recid, statement_ordinal, citation_ordinal),
    FOREIGN KEY (run_id, report_recid)
        REFERENCES mandates.sg_report_page_one_outcomes (run_id, report_recid),
    -- A pinpoint's text is recorded exactly when the citation targets a part.
    CONSTRAINT sg_report_page_one_links_part_text_when_part
        CHECK ((target_part_kind = 'whole') = (target_part_text IS NULL))
);

-- ===========================================================================
-- mandates.sg_report_page_one_vs_stage1_keys
--
-- Every page-one run against Stage 1, one row per (run, report, match key)
-- found on either side, for the reports in that run's population. Not tied
-- to acceptance, so any two runs can be compared; the per-report view below
-- reads the accepted run's rows.
--
-- Page one's side: the run's mandating citations (citation_role mandating,
-- mandating_founding or mandating_most_recent), every instrument kind, with
-- page_one_instrument_kind so additions can be split by kind. Every key is
-- kept, including those with no registry page; page_one_has_page says which
-- is which, so citations the site cannot show stay queryable. Kind and
-- has-page both follow from the key within a run (the symbol, and the run's
-- one lookup), so a key carries one of each; a key that ever showed two would
-- appear as two rows rather than be merged.
--
-- Stage 1's side: the keys the website displays for the report. Three rules,
-- each mirroring getSgReportsMandatedByResolution in
-- website/src/lib/data/sg-report-links.ts; a change there must be made here
-- too, and the other way round:
--   1. citation_sense in DISPLAY_ELIGIBLE_SENSES;
--   2. report_recid not in DISPLAY_EXCLUDED_REPORT_RECIDS;
--   3. resolution_display_candidates not empty: the website matches a page by
--      $1 = ANY (l.resolution_display_candidates), which no empty array
--      satisfies, so such a row is never displayed.
-- ===========================================================================
CREATE VIEW mandates.sg_report_page_one_vs_stage1_keys AS
WITH page_one AS (
    SELECT l.run_id,
           l.report_recid,
           l.cited_match_key AS match_key,
           l.instrument_kind,
           cardinality(l.cited_display_candidates) > 0 AS has_page
    FROM mandates.sg_report_page_one_links l
    WHERE l.citation_role IN ('mandating', 'mandating_founding', 'mandating_most_recent')
    GROUP BY l.run_id, l.report_recid, l.cited_match_key, l.instrument_kind,
             cardinality(l.cited_display_candidates) > 0
),
stage1 AS (
    SELECT o.run_id,
           s.report_recid,
           s.resolution_match_key AS match_key
    FROM mandates.sg_report_page_one_outcomes o
    JOIN mandates.sg_report_to_mandate_links s ON s.report_recid = o.report_recid
    -- Rule 1: DISPLAY_ELIGIBLE_SENSES
    WHERE s.citation_sense IN ('direct_request', 'founding_renewal', 'additional_joint',
                               'activities_carried_out')
      -- Rule 2: DISPLAY_EXCLUDED_REPORT_RECIDS (duplicate catalogue records)
      AND s.report_recid NOT IN (494738, 3945711, 3968269, 4096508)
      -- Rule 3: the page match on resolution_display_candidates
      AND cardinality(s.resolution_display_candidates) > 0
    GROUP BY o.run_id, s.report_recid, s.resolution_match_key
)
SELECT run_id,
       report_recid,
       match_key,
       page_one.instrument_kind AS page_one_instrument_kind,
       page_one.has_page AS page_one_has_page,
       page_one.match_key IS NOT NULL AS on_page_one,
       stage1.match_key IS NOT NULL AS on_stage1
FROM page_one
FULL JOIN stage1 USING (run_id, report_recid, match_key);

-- ===========================================================================
-- mandates.sg_report_page_one_vs_stage1
--
-- One row per report in the accepted run. "The accepted run" is the run named
-- by the acceptance row with the latest accepted_at, ties broken by the
-- higher acceptance_id. It is not the highest run_id among accepted runs:
-- rolling back is a new acceptance row naming an older run. With no
-- acceptance row the view is empty.
--
-- The two key sets are those of sg_report_page_one_vs_stage1_keys for the
-- accepted run, so the rules for each side are written once, there. Both
-- sets are what the site would display: Stage 1's keys already pass the
-- website's rules in that view, and page one's keys are taken only where
-- page_one_has_page, the same registry-page rule as Stage 1's rule 3. A
-- page-one key with no page is left out here and stays visible in the key
-- view. Each set is NULL when that side has no displayable keys for the
-- report; NULL is absence and is not filled in.
--
-- comparison, in the order the CASE tests it:
--   neither         no displayable keys on either side
--   page_one_only   page one has displayable keys, Stage 1 none
--   stage1_only     Stage 1 has displayable keys, page one none (refused,
--                   with refusal_reason; or linked only to instruments that
--                   have no registry page)
--   same_set        identical sets
--   page_one_adds   page one's set strictly contains Stage 1's
--   stage1_adds     Stage 1's set strictly contains page one's
--   disjoint        no key in common
--   each_adds       some keys in common, and each side has a key the other lacks
-- ===========================================================================
CREATE VIEW mandates.sg_report_page_one_vs_stage1 AS
WITH accepted_run AS (
    SELECT a.run_id
    FROM mandates.sg_report_page_one_run_acceptances a
    ORDER BY a.accepted_at DESC, a.acceptance_id DESC
    LIMIT 1
),
key_sets AS (
    SELECT k.run_id,
           k.report_recid,
           array_agg(DISTINCT k.match_key ORDER BY k.match_key)
               FILTER (WHERE k.on_page_one AND k.page_one_has_page) AS page_one_match_keys,
           array_agg(DISTINCT k.match_key ORDER BY k.match_key)
               FILTER (WHERE k.on_stage1) AS stage1_match_keys
    FROM mandates.sg_report_page_one_vs_stage1_keys k
    JOIN accepted_run r ON r.run_id = k.run_id
    GROUP BY k.run_id, k.report_recid
)
SELECT o.run_id,
       o.report_recid,
       o.report_symbols,
       o.outcome,
       o.refusal_stage,
       o.refusal_reason,
       ks.page_one_match_keys,
       ks.stage1_match_keys,
       CASE
           WHEN ks.page_one_match_keys IS NULL AND ks.stage1_match_keys IS NULL THEN 'neither'
           WHEN ks.stage1_match_keys IS NULL THEN 'page_one_only'
           WHEN ks.page_one_match_keys IS NULL THEN 'stage1_only'
           WHEN ks.page_one_match_keys = ks.stage1_match_keys THEN 'same_set'
           WHEN ks.page_one_match_keys @> ks.stage1_match_keys THEN 'page_one_adds'
           WHEN ks.stage1_match_keys @> ks.page_one_match_keys THEN 'stage1_adds'
           WHEN NOT (ks.page_one_match_keys && ks.stage1_match_keys) THEN 'disjoint'
           ELSE 'each_adds'
       END AS comparison
FROM mandates.sg_report_page_one_outcomes o
JOIN accepted_run r ON r.run_id = o.run_id
LEFT JOIN key_sets ks ON ks.run_id = o.run_id AND ks.report_recid = o.report_recid;

-- ===========================================================================
-- Comments
-- ===========================================================================
COMMENT ON TABLE mandates.sg_report_page_one_runs IS
  'One row per run of the page-one extractor. A run reads the first pages of each Secretary-'
  'General report in its population and records, per report, whether the report states what '
  'it was submitted under (sg_report_page_one_outcomes) and which instruments it names '
  '(sg_report_page_one_links). This row is the run''s provenance: the code, vocabulary and '
  'inputs it ran on, each named by hash, so a run can be reproduced and two runs compared. '
  'Rows are never replaced; a new run is a new row. Its outcome and link rows are copied in '
  'unchanged from the extractor''s output files by a loader, which assigns run_id.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.run_id IS
  'The run''s identity, assigned by the database when the run is loaded. Ordinal only.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.run_kind IS
  'How the extractor produced the rows. extractor_run_jsonl: the extractor wrote its rows to '
  'files without a database connection, and the loader copied them in unchanged. The only '
  'kind the extractor has; a new kind is a migration.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.started_at IS
  'When the extractor started the run.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.finished_at IS
  'When the extractor finished the run, before its output was written.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.extractor_version IS
  'The extractor''s version string. It changes with any change that can change output (code, '
  'vocabulary or grammar), and one version string should always come with the same '
  'extractor_tree_hash and cue_vocabulary_sha256.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.extractor_tree_hash IS
  'The git tree hash of the extractor''s package directory as it was when it ran. Always a '
  'committed tree here (see tree_dirty), so the exact code can be checked out again.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.tree_dirty IS
  'Whether the package directory had uncommitted changes when the extractor ran. Always false '
  'here (CHECK): a run from a dirty tree names code that no commit holds, so it cannot be '
  'reproduced and is refused. Kept as a column so a loaded run matches the extractor''s '
  'output field for field.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.cue_vocabulary_sha256 IS
  'sha256 of the phrase vocabulary the run read (relation phrases, anchor nouns and other '
  'cues), which is data beside the code and changes separately from it.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.input_manifest_sha256 IS
  'sha256 of the input manifest: the file listing every report in the population and every '
  'rendition file read, each file named by its own sha256 and verified before it was opened.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.input_manifest_label IS
  'The operator''s label for the input manifest, normally its file name. A label only; the '
  'hash is the identity.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.acquisition_disposition_export_sha256 IS
  'sha256 of the acquisition disposition export read beside the manifest: one row per report '
  'that holds no DOCX, with the acquisition process''s own account of why. Its dispositions are '
  'copied to sg_report_page_one_outcomes.acquisition_docx_dispositions.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.acquisition_disposition_export_label IS
  'The operator''s label for the acquisition disposition export, normally its file name.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.display_lookup_sha256 IS
  'sha256 of the registry page-symbol export the run used to fill cited_display_candidates on '
  'its link rows.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.display_lookup_label IS
  'The operator''s label for the registry page-symbol export, normally its file name.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.display_candidates IS
  'Whether the run was given the registry page-symbol export. Always looked_up here (CHECK): '
  'a run without it is refused, because its link rows would carry no display candidates and '
  'could not be shown. Kept as a column so a loaded run matches the extractor''s output field '
  'for field.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.population_description IS
  'A sentence, written by the extractor, saying how the population was drawn from the input '
  'manifest.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.run_host_label IS
  'A label for the machine the run was made on, chosen by the operator; never read from the '
  'host itself.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.reports_in_population IS
  'Reports in the run''s population. Equals reports_linked + reports_refused (CHECK), and '
  'should equal the run''s row count in sg_report_page_one_outcomes.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.reports_linked IS
  'Reports with outcome linked.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.reports_refused IS
  'Reports with outcome refused.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.link_rows_written IS
  'Link rows the run wrote; should equal the run''s row count in sg_report_page_one_links.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.output_rows_sha256 IS
  'sha256 over the run''s outcome rows then link rows, each serialised canonically in key '
  'order and without run_id. Two runs of one version over one manifest must have the same '
  'value; a difference means the extractor is not deterministic.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.docx_structure_unmodelled_recids IS
  'Reports whose DOCX the reader could not model (refusal reason docx_structure_unmodelled), '
  'listed so a never-seen file shape is visible from the run row. Usually empty.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.runtime_versions IS
  'Versions of the interpreter and libraries the output depends on (for example python, '
  'pymupdf), as a JSON object.';

COMMENT ON TABLE mandates.sg_report_page_one_run_acceptances IS
  'Which page-one run the display reads. Each row accepts one run, after its output has been '
  'audited. The display reads the run named by the row with the latest accepted_at, ties '
  'broken by the higher acceptance_id; rolling back is a new row naming an older run. '
  'Append-only: rows are never updated or deleted. Written by an administrator only; the '
  'page-one writer role has no privilege on it, so a run never becomes visible by being '
  'written.';
COMMENT ON COLUMN mandates.sg_report_page_one_run_acceptances.acceptance_id IS
  'The acceptance''s identity, assigned by the database. Breaks ties in accepted_at.';
COMMENT ON COLUMN mandates.sg_report_page_one_run_acceptances.run_id IS
  'The run accepted.';
COMMENT ON COLUMN mandates.sg_report_page_one_run_acceptances.accepted_at IS
  'When the run was accepted, as stated by the person accepting it.';
COMMENT ON COLUMN mandates.sg_report_page_one_run_acceptances.accepted_by_role IS
  'The database role that wrote the acceptance.';
COMMENT ON COLUMN mandates.sg_report_page_one_run_acceptances.acceptance_basis IS
  'Why the run was accepted: the audit or check it passed, in words a later reader can follow.';

COMMENT ON TABLE mandates.sg_report_page_one_outcomes IS
  'One row per report per page-one run: whether the report''s first pages state what it was '
  'submitted under. linked: at least one statement names a mandating instrument that passed '
  'every check, and its citations are in sg_report_page_one_links. refused: no such statement, '
  'with the stage and reason from a closed list, and the evidence read. Every report in a run''s '
  'population has exactly one row, so coverage is counted from these rows at read time and '
  'nothing coverage-derived is stored.';
COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.run_id IS
  'The run this outcome belongs to.';
COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.report_recid IS
  'The report''s Digital Library record id (digitallibrary.documents.recid), as in '
  'sg_report_to_mandate_links.report_recid.';
COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.report_symbols IS
  'Every document symbol the Digital Library record carries. {} is a real absence, not '
  'missing data.';
COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.outcome IS
  'linked or refused.';
COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.refusal_stage IS
  'Where the refusal happened: rendition (no DOCX held), document (the DOCX is a corrigendum '
  'or could not be read), statement (no usable statement), citation (the statement''s '
  'instruments failed their checks) or issued_pdf (the statement is not in the issued PDF). '
  'NULL exactly when linked. Fixed by refusal_reason (CHECK).';
COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.refusal_reason IS
  'Why the report is not linked, from a closed list enforced by CHECK: adding a reason is a '
  'migration. NULL exactly when linked. statement_cites_no_instrument is a correct answer (the '
  'mandate is not a resolution or decision), not a gap.';
COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.refusal_evidence IS
  'What the extractor read in reaching the refusal (the sentence, the title, the token, the '
  'exception text, or the acquisition record), as a JSON object. NULL exactly when linked.';
COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.partial_refusals IS
  'Statements and citations refused inside the report, besides the outcome''s own reason, one '
  'text entry each ("stage/reason: evidence"). On a linked report these are the parts that did '
  'not link, so a partial refusal is never silent. {} when there are none.';
COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.acquisition_docx_dispositions IS
  'For a report with no DOCX held, the acquisition export''s disposition for each candidate '
  'Word file (for example ods_word_absent, ods_word_deferred_at_presence), so "the file does '
  'not exist" and "acquisition has not fetched it yet" are told apart by a WHERE clause. NULL '
  'exactly when a DOCX is held (CHECK); {} when none is listed.';
COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.rendition_sha256 IS
  'sha256 of the DOCX the report was read from. NULL exactly when refused at the rendition '
  'stage.';
COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.rendition_source_system IS
  'Where the DOCX came from: ods (the UN Official Document System), the only source the '
  'extractor reads DOCX from. NULL exactly when refused at the rendition stage.';
COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.rendition_format IS
  'The rendition''s format as sniffed from its bytes: docx. NULL exactly when refused at the '
  'rendition stage.';
COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.issued_pdf_check IS
  'Whether each statement found was also found in the issued PDF''s text: statement_found '
  '(all were), statement_not_found (at least one was not, which can still be a linked report), '
  'no_pdf_held. NULL exactly when no statement was found (CHECK).';
COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.statements_found IS
  'Statements the extractor found in the front matter, linked or refused.';

COMMENT ON TABLE mandates.sg_report_page_one_links IS
  'One row per citation the page-one extractor kept from a linked report: the statement it '
  'sits in and the instrument it names. Mandating citations are the link; additional and '
  'context citations are stored for audit and comparison and are not links. Refused citations '
  'have no row (they are in the outcome''s partial_refusals). Ordinals are document order. '
  'Compare with sg_report_to_mandate_links, which reads Digital Library notes rather than the '
  'report.';
COMMENT ON COLUMN mandates.sg_report_page_one_links.run_id IS
  'The run this row belongs to.';
COMMENT ON COLUMN mandates.sg_report_page_one_links.report_recid IS
  'The report''s Digital Library record id; with run_id, the outcome this row belongs to.';
COMMENT ON COLUMN mandates.sg_report_page_one_links.statement_ordinal IS
  'The statement''s position among all statements found in the report, from 1, in document '
  'order (mandate-source box, title footnote, summary, first section). Refused statements '
  'keep their place, so ordinals can skip.';
COMMENT ON COLUMN mandates.sg_report_page_one_links.citation_ordinal IS
  'The citation''s position within its statement, from 1. Refused citations keep their place, '
  'so ordinals can skip.';
COMMENT ON COLUMN mandates.sg_report_page_one_links.statement_region IS
  'Where in the front matter the statement is: mandate_source_box (the "Mandate source:" '
  'field some reports carry), title_footnote, summary, or first_section.';
COMMENT ON COLUMN mandates.sg_report_page_one_links.statement_paragraph_label IS
  'The document''s own paragraph number or label for the statement (for example "1."). NULL '
  'where the region is unnumbered.';
COMMENT ON COLUMN mandates.sg_report_page_one_links.statement_form IS
  'The sentence shape that tied the statement to the present report, for example predicate '
  '("The present report is submitted pursuant to ..."), fronted ("Pursuant to ..., the present '
  'report ..."), or mandate_source_box. A new form is a migration.';
COMMENT ON COLUMN mandates.sg_report_page_one_links.relation_phrase IS
  'The relation phrase as it stands in the extractor''s vocabulary (for example "pursuant to"). '
  'NULL where the form carries none, such as the mandate-source box. Not a CHECK list: the '
  'vocabulary is data versioned by cue_vocabulary_sha256 on the run.';
COMMENT ON COLUMN mandates.sg_report_page_one_links.statement_text IS
  'The statement sentence, copied verbatim (whitespace normalised, footnote markers removed). '
  'Stored for audit queries; not rendered on the site. Repeated on each citation row of the '
  'statement.';
COMMENT ON COLUMN mandates.sg_report_page_one_links.citation_role IS
  'What the instrument is to the report: mandating (the report is submitted under it), '
  'mandating_founding and mandating_most_recent (a mandate cited with its origin and latest '
  'renewal), additional (also responds to it), context (named in the sentence but outside the '
  'relation''s object). Only the three mandating values are links.';
COMMENT ON COLUMN mandates.sg_report_page_one_links.instrument_kind IS
  'resolution, decision, or presidential_statement.';
COMMENT ON COLUMN mandates.sg_report_page_one_links.organ_provenance IS
  'How the issuing organ was known: stated before the citation, inherited from earlier in the '
  'sentence or the list, named in a relative_clause after it, intrinsic to the symbol (a '
  'presidential statement), or canonical (the mandate-source box gives full symbols). A '
  'citation whose organ is not known in the same sentence is refused, never guessed.';
COMMENT ON COLUMN mandates.sg_report_page_one_links.cited_prose IS
  'The citation as written in the sentence (for example "General Assembly resolution 79/1").';
COMMENT ON COLUMN mandates.sg_report_page_one_links.cited_canonical IS
  'The instrument''s full symbol, built from the prose (for example A/RES/79/1).';
COMMENT ON COLUMN mandates.sg_report_page_one_links.cited_match_key IS
  'cited_canonical reduced for matching to a registry page, by the same function as '
  'sg_report_to_mandate_links.resolution_match_key, so the two tables compare on it.';
COMMENT ON COLUMN mandates.sg_report_page_one_links.cited_display_candidates IS
  'Every registry page symbol (public.unified_documents.ppb_full_document_symbol) this '
  'instrument could be shown under, looked up when the run was made. {} means the lookup '
  'found no page for it: a real state, not missing data. Never NULL: a run without the lookup '
  'is refused.';
COMMENT ON COLUMN mandates.sg_report_page_one_links.target_part_kind IS
  'Which part of the instrument is cited: whole, paragraph, paragraphs, section, '
  'section_paragraph, annex, annex_paragraph.';
COMMENT ON COLUMN mandates.sg_report_page_one_links.target_part_text IS
  'The pinpoint as written (for example "paragraph 12", "section IV"). NULL exactly when the '
  'whole instrument is cited (CHECK).';
COMMENT ON COLUMN mandates.sg_report_page_one_links.open_ended_tail IS
  'Words that extend the citation without naming another instrument (for example "and '
  'subsequent resolutions"), verbatim. NULL when there are none.';
COMMENT ON COLUMN mandates.sg_report_page_one_links.hyperlink_target IS
  'The hyperlink on the citation''s symbol in the DOCX, if any. Where it names a symbol it has '
  'been checked against the prose; a disagreement refuses the citation. NULL means the symbol '
  'was not linked.';

COMMENT ON VIEW mandates.sg_report_page_one_vs_stage1_keys IS
  'Every page-one run against Stage 1, one row per run, report and match key found on either '
  'side, for the reports in the run''s population. Page one''s side is its mandating citations '
  'of every instrument kind, including those with no registry page (see page_one_has_page); '
  'Stage 1''s side is the keys the website displays for the report, '
  'by the same three rules as getSgReportsMandatedByResolution in '
  'website/src/lib/data/sg-report-links.ts (sense allowlist, excluded duplicate records, a '
  'registry page to show it on). Read by audit queries, not by a page.';
COMMENT ON COLUMN mandates.sg_report_page_one_vs_stage1_keys.run_id IS
  'The page-one run.';
COMMENT ON COLUMN mandates.sg_report_page_one_vs_stage1_keys.report_recid IS
  'The report''s Digital Library record id, from the run''s population.';
COMMENT ON COLUMN mandates.sg_report_page_one_vs_stage1_keys.match_key IS
  'The cited instrument in matching form, comparable across the two sides.';
COMMENT ON COLUMN mandates.sg_report_page_one_vs_stage1_keys.page_one_instrument_kind IS
  'resolution, decision or presidential_statement, as page one read it. NULL when page one '
  'does not cite this key for the report.';
COMMENT ON COLUMN mandates.sg_report_page_one_vs_stage1_keys.page_one_has_page IS
  'True when the run''s lookup found at least one registry page for this key, so the site '
  'could show the link; false when it found none (cited_display_candidates is {}). The same '
  'rule the Stage 1 side applies before a key counts. NULL when page one does not cite this '
  'key for the report.';
COMMENT ON COLUMN mandates.sg_report_page_one_vs_stage1_keys.on_page_one IS
  'True when the run cites this key as mandating for the report.';
COMMENT ON COLUMN mandates.sg_report_page_one_vs_stage1_keys.on_stage1 IS
  'True when the website displays this key for the report from Stage 1''s links.';

COMMENT ON VIEW mandates.sg_report_page_one_vs_stage1 IS
  'Per report in the accepted page-one run, its mandating match keys that have a registry page '
  'against the Stage 1 match keys the website displays for the same report, so both sides are '
  'what the site would show, classified as neither, page_one_only, '
  'stage1_only, same_set, page_one_adds, stage1_adds, disjoint or each_adds. The accepted '
  'run is the one named by the acceptance with the latest accepted_at, ties broken by the '
  'higher acceptance_id. Read by audit queries, not by a page.';
COMMENT ON COLUMN mandates.sg_report_page_one_vs_stage1.run_id IS
  'The accepted run.';
COMMENT ON COLUMN mandates.sg_report_page_one_vs_stage1.report_recid IS
  'The report''s Digital Library record id. Every report in the accepted run appears once.';
COMMENT ON COLUMN mandates.sg_report_page_one_vs_stage1.report_symbols IS
  'The report''s document symbols, from its page-one outcome.';
COMMENT ON COLUMN mandates.sg_report_page_one_vs_stage1.outcome IS
  'The report''s page-one outcome, linked or refused.';
COMMENT ON COLUMN mandates.sg_report_page_one_vs_stage1.refusal_stage IS
  'The page-one refusal stage; NULL when linked.';
COMMENT ON COLUMN mandates.sg_report_page_one_vs_stage1.refusal_reason IS
  'The page-one refusal reason; NULL when linked. Explains a stage1_only row, unless the '
  'report is linked and only its keys lack a registry page.';
COMMENT ON COLUMN mandates.sg_report_page_one_vs_stage1.page_one_match_keys IS
  'Page one''s mandating match keys for the report that have a registry page, sorted and '
  'distinct. NULL when none. Keys without a page are in sg_report_page_one_vs_stage1_keys.';
COMMENT ON COLUMN mandates.sg_report_page_one_vs_stage1.stage1_match_keys IS
  'The Stage 1 match keys the website displays for the report, sorted and distinct. NULL when '
  'none.';
COMMENT ON COLUMN mandates.sg_report_page_one_vs_stage1.comparison IS
  'How the two sets relate: neither, page_one_only, stage1_only, same_set, page_one_adds, '
  'stage1_adds, disjoint, or each_adds (some keys shared, each side has one the other lacks).';

-- ===========================================================================
-- Grants, given explicitly; no default privilege is relied on.
-- ===========================================================================
GRANT USAGE ON SCHEMA mandates TO mandates_readonly;
GRANT SELECT ON mandates.sg_report_page_one_runs,
                mandates.sg_report_page_one_run_acceptances,
                mandates.sg_report_page_one_outcomes,
                mandates.sg_report_page_one_links,
                mandates.sg_report_page_one_vs_stage1_keys,
                mandates.sg_report_page_one_vs_stage1
    TO mandates_readonly;

-- The loader's role: INSERT on the three run tables, and SELECT on
-- runs.run_id alone, because INSERT ... RETURNING run_id needs SELECT on the
-- returned column and the loader must learn the id the database assigned
-- before it can insert the run's outcome and link rows. Nothing else. Schema
-- USAGE is what lets these grants be used at all.
GRANT USAGE ON SCHEMA mandates TO mandates_page_one_link_pipeline;
GRANT INSERT ON mandates.sg_report_page_one_runs,
                mandates.sg_report_page_one_outcomes,
                mandates.sg_report_page_one_links
    TO mandates_page_one_link_pipeline;
GRANT SELECT (run_id) ON mandates.sg_report_page_one_runs TO mandates_page_one_link_pipeline;

-- Exit assertion. GRANT by a role that lacks the right to grant warns rather
-- than fails, so check that the privileges above actually landed, and that
-- the writer holds nothing beyond INSERT on the three tables and SELECT on
-- runs.run_id.
DO $$
DECLARE
    table_name text;
    column_name text;
BEGIN
    IF NOT has_schema_privilege('mandates_readonly', 'mandates', 'USAGE')
       OR NOT has_schema_privilege('mandates_page_one_link_pipeline', 'mandates', 'USAGE') THEN
        RAISE EXCEPTION 'Schema USAGE on mandates did not land for both roles';
    END IF;
    FOREACH table_name IN ARRAY ARRAY[
        'mandates.sg_report_page_one_runs',
        'mandates.sg_report_page_one_run_acceptances',
        'mandates.sg_report_page_one_outcomes',
        'mandates.sg_report_page_one_links',
        'mandates.sg_report_page_one_vs_stage1_keys',
        'mandates.sg_report_page_one_vs_stage1'
    ] LOOP
        IF NOT has_table_privilege('mandates_readonly', table_name, 'SELECT') THEN
            RAISE EXCEPTION 'mandates_readonly lacks SELECT on %', table_name;
        END IF;
        IF has_any_column_privilege('mandates_page_one_link_pipeline', table_name, 'UPDATE, REFERENCES')
           OR has_table_privilege('mandates_page_one_link_pipeline', table_name, 'DELETE, TRUNCATE, TRIGGER') THEN
            RAISE EXCEPTION 'mandates_page_one_link_pipeline may change or reference %', table_name;
        END IF;
        IF table_name <> 'mandates.sg_report_page_one_runs'
           AND has_any_column_privilege('mandates_page_one_link_pipeline', table_name, 'SELECT') THEN
            RAISE EXCEPTION 'mandates_page_one_link_pipeline can read %', table_name;
        END IF;
    END LOOP;
    -- On runs: SELECT on run_id and on no other column. A table-level SELECT
    -- would show here as SELECT on every column, so it fails too.
    IF NOT has_column_privilege('mandates_page_one_link_pipeline',
                                'mandates.sg_report_page_one_runs', 'run_id', 'SELECT') THEN
        RAISE EXCEPTION 'mandates_page_one_link_pipeline lacks SELECT on sg_report_page_one_runs.run_id';
    END IF;
    FOR column_name IN
        SELECT a.attname
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = 'mandates.sg_report_page_one_runs'::regclass
          AND a.attnum > 0 AND NOT a.attisdropped AND a.attname <> 'run_id'
    LOOP
        IF has_column_privilege('mandates_page_one_link_pipeline',
                                'mandates.sg_report_page_one_runs', column_name, 'SELECT') THEN
            RAISE EXCEPTION 'mandates_page_one_link_pipeline can read sg_report_page_one_runs.%', column_name;
        END IF;
    END LOOP;
    FOREACH table_name IN ARRAY ARRAY[
        'mandates.sg_report_page_one_runs',
        'mandates.sg_report_page_one_outcomes',
        'mandates.sg_report_page_one_links'
    ] LOOP
        IF NOT has_table_privilege('mandates_page_one_link_pipeline', table_name, 'INSERT') THEN
            RAISE EXCEPTION 'mandates_page_one_link_pipeline lacks INSERT on %', table_name;
        END IF;
    END LOOP;
    IF has_any_column_privilege('mandates_page_one_link_pipeline',
                                'mandates.sg_report_page_one_run_acceptances', 'INSERT') THEN
        RAISE EXCEPTION 'mandates_page_one_link_pipeline must not write acceptances';
    END IF;
END
$$;
