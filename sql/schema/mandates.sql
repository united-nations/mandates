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