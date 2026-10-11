-- =============================================================================
-- mandates schema
-- Stores structured paragraph-level content extracted from UN documents and
-- the normalised mandate objects derived from each paragraph.
--
-- Source JSON files: data/fulltexts/paragraphs/<sanitized_symbol>.json
-- Loader:           src/fulltexts/fulltexts_to_db.py
--
-- Re-runnable: the schema is dropped and recreated from scratch each run.
--
-- UUID strategy
--   paragraphs.id          uuid5(NAMESPACE_URL, "<symbol>:<position>")
--                          — deterministic; reconstructable from the natural key
--   paragraph_mandates.id  uuid4() generated app-side
--                          — random; UNIQUE (paragraph_id, mandate_index) is the
--                            stable natural key
--   sg_report_to_mandate_links.id
--                          uuid5(NAMESPACE_URL, "<recid>:<note_index>:<canonical>:<span_start>")
--                          — deterministic, same strategy as paragraphs.id
--   sg_report_to_mandate_link_runs.id
--                          bigint identity — ordinal; a run has no natural key
--   sg_report_page_one_runs.run_id, sg_report_page_one_run_acceptances.acceptance_id
--                          bigint identity — ordinal, as above
--   sg_report_page_one_outcomes, sg_report_page_one_links
--                          no surrogate id; natural composite keys under run_id
--   all child table ids    gen_random_uuid() via DEFAULT
-- =============================================================================
DROP SCHEMA IF EXISTS mandates CASCADE;
CREATE SCHEMA mandates;
-- ===========================================================================
-- paragraphs
-- One row per paragraph object in the source JSON array.
-- Not all ppb2026.source_documents have a fulltext JSON; rows only exist when
-- a fulltext was successfully extracted.
-- ===========================================================================
CREATE TABLE mandates.paragraphs (
    -- Deterministic UUID: uuid5(URL_NAMESPACE, "<document_symbol>:<position>")
    -- Reconstructable from the natural key without a DB lookup.
    -- Do NOT use gen_random_uuid() here.
    id UUID PRIMARY KEY,
    document_symbol TEXT NOT NULL REFERENCES ppb2026.source_documents (ppb_full_document_symbol) ON DELETE CASCADE,
    -- 0-based position within the document array.
    -- Use the UUID for stable external/NLP references; positions may shift
    -- if the extraction pipeline is re-run with different chunking logic.
    position INTEGER NOT NULL,
    -- core content
    text TEXT NOT NULL,
    type TEXT NOT NULL,
    -- structural classification
    heading_level SMALLINT,
    paragraph_type TEXT,
    paragraph_level SMALLINT,
    -- displayed prefix, e.g. '1.', '(a)', '(i)'
    prefix TEXT,
    -- NLP enrichment (populated by pipeline, may be NULL)
    text_with_highlights TEXT,
    uncertainties TEXT,
    -- Raw mandate extraction output kept as JSONB source-of-truth.
    -- Normalised into paragraph_mandates + child tables for querying.
    mandates JSONB,
    UNIQUE (document_symbol, position)
);
CREATE INDEX idx_paragraphs_symbol ON mandates.paragraphs (document_symbol);
CREATE INDEX idx_paragraphs_type ON mandates.paragraphs (type);
-- ===========================================================================
-- paragraph_links
-- Normalises the `links` array from each paragraph object.
-- Each element is a [document_symbol, url] pair referencing another document.
-- ===========================================================================
CREATE TABLE mandates.paragraph_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paragraph_id UUID NOT NULL REFERENCES mandates.paragraphs (id) ON DELETE CASCADE,
    -- Raw symbol as it appears in the source text, e.g. 'A/79/L.2', '46/182'
    linked_symbol TEXT NOT NULL,
    linked_url TEXT
);
CREATE INDEX idx_paragraph_links_paragraph_id ON mandates.paragraph_links (paragraph_id);
CREATE INDEX idx_paragraph_links_symbol ON mandates.paragraph_links (linked_symbol);
-- ===========================================================================
-- paragraph_mandates
-- One row per mandate extracted from a paragraph (one per element in
-- the mandates JSONB array).  mandate_index preserves ordering.
-- ===========================================================================
CREATE TABLE mandates.paragraph_mandates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paragraph_id UUID NOT NULL REFERENCES mandates.paragraphs (id) ON DELETE CASCADE,
    -- 0-based index within the paragraph's mandates array
    mandate_index SMALLINT NOT NULL,
    action_verb TEXT,
    action_verb_normalized TEXT,
    action_verb_type TEXT,
    UNIQUE (paragraph_id, mandate_index)
);
CREATE INDEX idx_paragraph_mandates_paragraph_id ON mandates.paragraph_mandates (paragraph_id);
CREATE INDEX idx_paragraph_mandates_action_verb_type ON mandates.paragraph_mandates (action_verb_type);
CREATE INDEX idx_paragraph_mandates_action_verb_norm ON mandates.paragraph_mandates (action_verb_normalized);
-- ===========================================================================
-- mandate_assignees
-- Who the mandate is directed at.
-- ===========================================================================
CREATE TABLE mandates.mandate_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mandate_id UUID NOT NULL REFERENCES mandates.paragraph_mandates (id) ON DELETE CASCADE,
    assignee TEXT,
    assignee_normalized TEXT,
    assignee_type TEXT
);
CREATE INDEX idx_mandate_assignees_mandate_id ON mandates.mandate_assignees (mandate_id);
CREATE INDEX idx_mandate_assignees_normalized ON mandates.mandate_assignees (assignee_normalized);
CREATE INDEX idx_mandate_assignees_type ON mandates.mandate_assignees (assignee_type);
-- ===========================================================================
-- mandate_deliverables
-- What the mandate asks to produce or accomplish.
-- ===========================================================================
CREATE TABLE mandates.mandate_deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mandate_id UUID NOT NULL REFERENCES mandates.paragraph_mandates (id) ON DELETE CASCADE,
    deliverable TEXT,
    deliverable_normalized TEXT,
    deliverable_type TEXT
);
CREATE INDEX idx_mandate_deliverables_mandate_id ON mandates.mandate_deliverables (mandate_id);
CREATE INDEX idx_mandate_deliverables_type ON mandates.mandate_deliverables (deliverable_type);
-- ===========================================================================
-- mandate_entities
-- Entities mentioned in the mandate (not necessarily the assignee).
-- ===========================================================================
CREATE TABLE mandates.mandate_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mandate_id UUID NOT NULL REFERENCES mandates.paragraph_mandates (id) ON DELETE CASCADE,
    mentioned_entity TEXT,
    mentioned_entity_normalized TEXT,
    mentioned_entity_type TEXT
);
CREATE INDEX idx_mandate_entities_mandate_id ON mandates.mandate_entities (mandate_id);
CREATE INDEX idx_mandate_entities_normalized ON mandates.mandate_entities (mentioned_entity_normalized);
CREATE INDEX idx_mandate_entities_type ON mandates.mandate_entities (mentioned_entity_type);
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
    resolution_role TEXT NOT NULL
        CHECK (resolution_role IN ('founding', 'most_recent', 'co_equal', 'establishing', 'additional')),
    citation_sense TEXT NOT NULL
        CHECK (citation_sense IN ('direct_request', 'founding_renewal', 'additional_joint',
                                  'activities_carried_out', 'body_established', 'prst_note_decision')),
    -- Where in the source note element the citation sits: report body, or an
    -- annex-description title. Note-level fact, stored per occurrence (the row
    -- grain). No default: a row the writer fails to position fails at insert.
    citation_position TEXT NOT NULL
        CHECK (citation_position IN ('body', 'annex_title')),
    organ_provenance TEXT NOT NULL
        CHECK (organ_provenance IN ('stated', 'inherited', 'intrinsic')),
    resolution_pinpoint TEXT,
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
  'but never shown as resolution links (the display filters them out by their citation_sense value). '
  'The resolution_* naming reflects the common, displayed case, not every stored row.';

COMMENT ON COLUMN mandates.sg_report_to_mandate_links.resolution_match_key IS
  'The same cited resolution, reduced to the form used for matching it to a page in the '
  'mandate registry. Differs from resolution_canonical only in edge cases where the cited '
  'form and the registry''s form need normalising to line up; usually identical.';

COMMENT ON COLUMN mandates.sg_report_to_mandate_links.resolution_display_candidates IS
  'Every registry page-symbol this resolution could be shown under, as an array. An empty '
  'array ({}) means no page exists for it yet — this is a real, expected state, NOT missing '
  'data and never NULL. Which candidate actually renders is chosen at read time.';
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
-- ===========================================================================
-- Page-one report-to-mandate links: runs, acceptances, outcomes, links, and
-- the two views comparing page-one runs with Stage 1. Design notes are in
-- sql/migrations/043_sg_report_page_one_links.sql.
--
-- Rows are kept per run and never replaced. Dropped with the schema on
-- rebuild, and not restored by re-running an extractor: a rebuild loses run
-- history and acceptances, which come back only by reloading each run's
-- output files and accepting again.
--
-- The writer role mandates_page_one_link_pipeline is not created here (it
-- needs a password): sql/migrations/043_sg_report_page_one_link_pipeline_role.sql.
-- ===========================================================================
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
-- ===========================================================================
-- unified_paragraphs (public view) — see sql/migrations/029_unified_paragraphs.sql
-- Combines the two paragraph corpora with the same precedence model as
-- public.unified_documents: mandates.paragraphs (richer, mandate-NER-tagged)
-- wins for any symbol it covers; digitallibrary.document_paragraphs (semantic
-- fulltext, lang='en') fills in every other resolution/PRST, mapped into the
-- legacy column contract that ParagraphsSection renders. Per-symbol lookups are
-- index-driven on both arms (idx_paragraphs_symbol / idx_document_paragraphs_symbol).
-- Kept here as the re-runnable from-scratch definition; migration 029 is the
-- applied delta (identical body). masthead frontmatter is excluded; the DL 'type'
-- vocabulary is carried verbatim (render-safe — the UI hides every non-heading,
-- non-operative/preambular element under its permanent 'operative' filter).
-- ===========================================================================
CREATE OR REPLACE VIEW public.unified_paragraphs AS
-- Arm 1: mandates.paragraphs (verbatim; wins for any symbol present here)
SELECT
    p.id,
    p.document_symbol,
    p.position,
    p.text,
    p.type,
    p.heading_level,
    p.paragraph_type,
    p.paragraph_level,
    p.prefix,
    p.text_with_highlights,
    p.uncertainties,
    p.mandates,
    COALESCE(
        (
            SELECT json_agg(
                       json_build_array(pl.linked_symbol, pl.linked_url)
                       ORDER BY pl.id
                   )
            FROM mandates.paragraph_links pl
            WHERE pl.paragraph_id = p.id
        ),
        '[]'::json
    ) AS links,
    NULL::text AS section,
    NULL::smallint AS annex_index,
    NULL::smallint AS text_index,
    true AS is_mandates
FROM mandates.paragraphs p
UNION ALL
-- Arm 2: digitallibrary.document_paragraphs (mapped; only symbols absent from Arm 1)
SELECT
    dp.id,
    dp.symbol_normalized AS document_symbol,
    dp.position,
    dp.text,
    dp.type,
    dp.heading_level,
    dp.paragraph_type,
    dp.level AS paragraph_level,
    dp.prefix,
    NULL::text AS text_with_highlights,
    NULL::text AS uncertainties,
    NULL::jsonb AS mandates,
    COALESCE(
        (
            SELECT json_agg(json_build_array(h->>'text', h->>'url'))
            FROM jsonb_array_elements(dp.hyperlinks) h
        ),
        '[]'::json
    ) AS links,
    dp.section,
    dp.annex_index,
    dp.text_index,
    false AS is_mandates
FROM digitallibrary.document_paragraphs dp
WHERE dp.lang = 'en'
    AND NOT (dp.type = 'frontmatter' AND dp.subtype = 'masthead')
    AND NOT EXISTS (
        SELECT 1
        FROM mandates.paragraphs mp
        WHERE upper(regexp_replace(mp.document_symbol, '[[:space:]]', '', 'g'))
              = dp.symbol_normalized
    );

grant select on public.unified_paragraphs to mandates_readonly;