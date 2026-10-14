-- ===========================================================================
-- 044: page-one links read from legacy Word (.DOC) renditions.
--
-- Widens the page-one tables of migration 043 for extractor 2.0.0. That
-- version reads a report from its legacy binary Word (.DOC) rendition when it
-- holds no DOCX, converting the file to DOCX inside the run, and refuses a
-- single report, instead of stopping the run, when what is held for it is
-- outside the extractor's model.
--
-- What changes:
--   sg_report_page_one_runs      two columns: converter_identity (the program
--                                that converted .DOC files) and
--                                rendition_unmodelled_recids (the reports
--                                refused as rendition_unmodelled). Both are
--                                NULL for runs before 2.0.0 and are set
--                                together.
--   sg_report_page_one_outcomes  rendition_format may be doc; three refusal
--                                reasons are added (no_word_rendition_held,
--                                rendition_unmodelled, doc_conversion_failed);
--                                acquisition_docx_dispositions is tied to
--                                whether a DOCX is held instead of to the
--                                rendition stage.
--
-- Why the dispositions tie moves. In 043, a report refused at the rendition
-- stage was exactly a report holding no DOCX, so
-- sg_report_page_one_outcomes_rendition_when_held required the dispositions
-- exactly on rendition-stage refusals. A report read from its .DOC holds no
-- DOCX and carries its dispositions, but it is not refused at the rendition
-- stage, so that clause would reject it. rendition_when_held is re-added
-- with its three rendition-column clauses and without the dispositions one,
-- and the new sg_report_page_one_outcomes_dispositions_when_no_docx carries
-- the tie on rendition_format instead. No other constraint in 043 mentions
-- the dispositions; the entry assertion checks that.
--
-- 043 declared the rendition_format CHECK inline without a name, so Postgres
-- named it <table>_<column>_check, which is
-- sg_report_page_one_outcomes_rendition_format_check. The entry assertion
-- confirms that name before it is dropped. It is re-added under the same
-- name, which is the name the inline CHECK in sql/schema/mandates.sql gets
-- on a rebuild, so a migrated database and a rebuilt one agree.
--
-- Every widening keeps 043's values, so rows loaded before 2.0.0 stay valid.
-- no_docx_rendition_held stays in the vocabulary for them; 2.0.0 writes
-- no_word_rendition_held (neither a DOCX nor a .DOC held) in its place.
--
-- Unchanged: the links table, both views, and the grants. 043's table-level
-- grants already cover new columns (SELECT for mandates_readonly, INSERT for
-- mandates_page_one_link_pipeline), and the writer's SELECT on runs stays on
-- run_id alone. The exit assertion checks all three.
--
-- APPLYING
--   As the role that owns the page-one tables (ALTER TABLE needs ownership),
--   inside a transaction that whoever applies it opens and commits. No
--   BEGIN/COMMIT here, so that transaction is not committed early. 043 must
--   already be applied.
-- Not re-runnable: the entry assertion stops a second application.
-- ===========================================================================

-- Entry assertion. Fails loudly unless both tables exist as 043 left them:
-- the outcomes table's CHECK constraints are exactly 043's, by name, so no
-- constraint this migration does not drop can still hold the old
-- dispositions tie or the docx-only format; none of the new columns or
-- constraints exists yet; and the applying role owns both tables.
DO $$
DECLARE
    table_name text;
    found_names text[];
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'mandates.sg_report_page_one_runs',
        'mandates.sg_report_page_one_outcomes'
    ] LOOP
        IF to_regclass(table_name) IS NULL THEN
            RAISE EXCEPTION 'Required table % is missing; apply 043 first', table_name;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c
                       WHERE c.oid = table_name::regclass
                         AND pg_has_role(current_user, c.relowner, 'USAGE')) THEN
            RAISE EXCEPTION 'Role % does not own %, so cannot alter it', current_user, table_name;
        END IF;
    END LOOP;

    IF EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a
               WHERE a.attrelid = 'mandates.sg_report_page_one_runs'::regclass
                 AND a.attname IN ('converter_identity', 'rendition_unmodelled_recids')
                 AND NOT a.attisdropped) THEN
        RAISE EXCEPTION 'sg_report_page_one_runs already has the 044 columns; this migration has been applied';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_constraint
               WHERE conname IN ('sg_report_page_one_runs_v2_fields_together',
                                 'sg_report_page_one_outcomes_dispositions_when_no_docx')) THEN
        RAISE EXCEPTION 'A 044 constraint already exists; this migration has been applied';
    END IF;

    -- 043's CHECK constraints on outcomes. Four are named in 043; four were
    -- declared inline on one column and carry Postgres's generated name.
    SELECT array_agg(conname::text ORDER BY conname::text COLLATE "C") INTO found_names
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'mandates.sg_report_page_one_outcomes'::regclass
      AND contype = 'c';
    IF found_names IS DISTINCT FROM ARRAY[
        'sg_report_page_one_outcomes_issued_pdf_check_check',
        'sg_report_page_one_outcomes_outcome_check',
        'sg_report_page_one_outcomes_pdf_check_when_statements',
        'sg_report_page_one_outcomes_refusal_vocabulary',
        'sg_report_page_one_outcomes_refusal_when_refused',
        'sg_report_page_one_outcomes_rendition_format_check',
        'sg_report_page_one_outcomes_rendition_source_system_check',
        'sg_report_page_one_outcomes_rendition_when_held'
    ] THEN
        RAISE EXCEPTION 'sg_report_page_one_outcomes CHECK constraints are not 043''s: found %', found_names;
    END IF;

    -- The generated name must belong to the CHECK on rendition_format alone.
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint c
                   JOIN pg_catalog.pg_attribute a
                     ON a.attrelid = c.conrelid AND a.attname = 'rendition_format'
                   WHERE c.conrelid = 'mandates.sg_report_page_one_outcomes'::regclass
                     AND c.conname = 'sg_report_page_one_outcomes_rendition_format_check'
                     AND c.conkey = ARRAY[a.attnum]) THEN
        RAISE EXCEPTION 'sg_report_page_one_outcomes_rendition_format_check is not the CHECK on rendition_format alone';
    END IF;

    -- The old dispositions tie lives in rendition_when_held and nowhere else.
    SELECT array_agg(c.conname::text ORDER BY c.conname::text COLLATE "C") INTO found_names
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_attribute a
      ON a.attrelid = c.conrelid AND a.attname = 'acquisition_docx_dispositions'
    WHERE c.conrelid = 'mandates.sg_report_page_one_outcomes'::regclass
      AND c.contype = 'c'
      AND a.attnum = ANY (c.conkey);
    IF found_names IS DISTINCT FROM ARRAY['sg_report_page_one_outcomes_rendition_when_held'] THEN
        RAISE EXCEPTION 'CHECK constraints on acquisition_docx_dispositions are not 043''s: found %', found_names;
    END IF;
END
$$;

-- ===========================================================================
-- mandates.sg_report_page_one_runs
-- ===========================================================================
ALTER TABLE mandates.sg_report_page_one_runs
    ADD COLUMN converter_identity TEXT,
    ADD COLUMN rendition_unmodelled_recids INTEGER[],
    -- Both fields arrive with extractor 2.0.0; a run before it has neither.
    ADD CONSTRAINT sg_report_page_one_runs_v2_fields_together
        CHECK ((converter_identity IS NULL) = (rendition_unmodelled_recids IS NULL));

-- ===========================================================================
-- mandates.sg_report_page_one_outcomes
-- ===========================================================================
ALTER TABLE mandates.sg_report_page_one_outcomes
    DROP CONSTRAINT sg_report_page_one_outcomes_rendition_format_check,
    ADD CONSTRAINT sg_report_page_one_outcomes_rendition_format_check
        CHECK (rendition_format IN ('docx', 'doc')),
    DROP CONSTRAINT sg_report_page_one_outcomes_refusal_vocabulary,
    -- The closed refusal vocabulary: each reason belongs to exactly one stage.
    ADD CONSTRAINT sg_report_page_one_outcomes_refusal_vocabulary
        CHECK (refusal_reason IS NULL OR (refusal_stage, refusal_reason) IN (
            ('rendition',  'no_rendition_held'),
            ('rendition',  'no_docx_rendition_held'),   -- runs before 2.0.0 only
            ('rendition',  'no_word_rendition_held'),
            ('rendition',  'rendition_unmodelled'),
            ('document',   'corrigendum_document'),
            ('document',   'doc_conversion_failed'),
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
    DROP CONSTRAINT sg_report_page_one_outcomes_rendition_when_held,
    -- The rendition columns are NULL exactly when the report is refused at the
    -- rendition stage (as in 043; the dispositions clause has moved below).
    ADD CONSTRAINT sg_report_page_one_outcomes_rendition_when_held
        CHECK ((refusal_stage IS NOT DISTINCT FROM 'rendition') = (rendition_sha256 IS NULL)
               AND (refusal_stage IS NOT DISTINCT FROM 'rendition') = (rendition_source_system IS NULL)
               AND (refusal_stage IS NOT DISTINCT FROM 'rendition') = (rendition_format IS NULL)),
    -- The acquisition dispositions are present exactly when the report holds no
    -- DOCX: a report read from its DOCX has none; one read from its .DOC, or
    -- refused for holding no Word file, has them. A report refused as
    -- rendition_unmodelled has them if, and only if, it holds no DOCX, which
    -- the outcome row does not record, so that one reason is left
    -- unconstrained.
    ADD CONSTRAINT sg_report_page_one_outcomes_dispositions_when_no_docx
        CHECK (CASE
                   WHEN rendition_format = 'docx' THEN acquisition_docx_dispositions IS NULL
                   WHEN rendition_format = 'doc' THEN acquisition_docx_dispositions IS NOT NULL
                   WHEN refusal_reason IN ('no_rendition_held', 'no_docx_rendition_held', 'no_word_rendition_held')
                       THEN acquisition_docx_dispositions IS NOT NULL
                   ELSE true
               END);

-- ===========================================================================
-- Comments
-- ===========================================================================
COMMENT ON COLUMN mandates.sg_report_page_one_runs.converter_identity IS
  'The version line of the program the run used to convert legacy Word (.DOC) files to DOCX, '
  'exactly as the program printed it (for example LibreOffice 26.8.1.1 followed by its source '
  'commit). The extractor stops before reading anything unless this equals the line pinned in '
  'its package, so the line is fixed by extractor_tree_hash; it is recorded so that the runs '
  'table itself shows what converted, and two hosts can be compared. It does not name the '
  'platform, fonts or libraries (runtime_versions records the platform). NULL for runs of '
  'extractor versions before 2.0.0, which used no converter.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.rendition_unmodelled_recids IS
  'Reports refused because what the run holds for them is outside the model (refusal reason '
  'rendition_unmodelled: a file format the extractor neither reads nor refuses by name, or '
  'an unexpected combination of files), listed so a never-seen holding is visible from the '
  'run row, as docx_structure_unmodelled_recids is for files. Usually empty. NULL for runs '
  'of extractor versions before 2.0.0, which stopped instead.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.runtime_versions IS
  'Versions of the interpreter and libraries the output depends on (python, pymupdf and '
  'the MuPDF library it wraps), as a JSON object. From extractor 2.0.0 each is pinned in the '
  'package and checked before the run reads anything, and the object also records the '
  'platform the run ran on.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.docx_structure_unmodelled_recids IS
  'Reports whose DOCX the reader could not model (refusal reason docx_structure_unmodelled), '
  'listed so a never-seen file shape is visible from the run row. From extractor 2.0.0 this '
  'includes a legacy Word (.DOC) file after conversion, and a text shape the statement '
  'grammar does not model. Usually empty.';
COMMENT ON COLUMN mandates.sg_report_page_one_runs.extractor_version IS
  'The extractor''s version string. It changes with any change that can change output (code, '
  'vocabulary, grammar, or a pinned dependency), and one version string should always come '
  'with the same extractor_tree_hash, cue_vocabulary_sha256 and converter_identity.';

COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.rendition_format IS
  'The format of the Word rendition the report was read from, as sniffed from its bytes: docx, '
  'or doc (legacy binary Word, the 1997-2003 format, converted to DOCX inside the run by the '
  'converter named in the run''s converter_identity; the converted file is never stored). '
  'NULL exactly when refused at the rendition stage.';
COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.rendition_sha256 IS
  'sha256 of the Word file the report was read from: the DOCX, or the .DOC itself, never the '
  'bytes of its conversion, which differ from one conversion to the next. NULL exactly when '
  'refused at the rendition stage.';
COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.rendition_source_system IS
  'Where the Word file came from: ods (the UN Official Document System), the only source the '
  'extractor reads Word files from. NULL exactly when refused at the rendition stage.';
COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.refusal_stage IS
  'Where the refusal happened: rendition (no Word file the extractor reads is held), document '
  '(the report is a corrigendum, or its file could not be converted or read), statement (no '
  'usable statement), citation (the statement''s instruments failed their checks) or '
  'issued_pdf (the statement is not in the issued PDF). NULL exactly when linked. Fixed by '
  'refusal_reason (CHECK).';
COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.refusal_reason IS
  'Why the report is not linked, from a closed list enforced by CHECK: adding a reason is a '
  'migration. NULL exactly when linked. statement_cites_no_instrument is a correct answer (the '
  'mandate is not a resolution or decision), not a gap. From extractor 2.0.0, '
  'no_word_rendition_held (the report holds neither a DOCX nor a .DOC) replaces '
  'no_docx_rendition_held, which only earlier runs carry; rendition_unmodelled means the '
  'files held are outside the model, and doc_conversion_failed that the .DOC did not convert.';
COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.acquisition_docx_dispositions IS
  'For a report with no DOCX held, the acquisition export''s disposition for each candidate '
  'Word file (for example ods_word_absent, ods_word_present_downloaded_as_doc), so "the file '
  'does not exist", "acquisition has not fetched it yet" and "it was fetched as a .DOC" are told '
  'apart by a WHERE clause. NULL exactly when a DOCX is held; present on a report read from '
  'its .DOC (CHECK); {} when none is listed.';
COMMENT ON COLUMN mandates.sg_report_page_one_outcomes.refusal_evidence IS
  'What the extractor read in reaching the refusal (the sentence, the title, the token, the '
  'exception text, the converter''s message, or the acquisition record), as a JSON object. '
  'NULL exactly when linked.';

-- Exit assertion. Checks that the new columns and constraints landed as
-- written, that every row already in either table satisfies every CHECK on
-- it, and that 043's grants cover the new columns as intended.
DO $$
DECLARE
    found_names text[];
    con record;
    violating bigint;
    column_name text;
BEGIN
    IF (SELECT format_type(a.atttypid, a.atttypmod) FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = 'mandates.sg_report_page_one_runs'::regclass
          AND a.attname = 'converter_identity' AND NOT a.attisdropped) IS DISTINCT FROM 'text' THEN
        RAISE EXCEPTION 'sg_report_page_one_runs.converter_identity is missing or not text';
    END IF;
    IF (SELECT format_type(a.atttypid, a.atttypmod) FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = 'mandates.sg_report_page_one_runs'::regclass
          AND a.attname = 'rendition_unmodelled_recids' AND NOT a.attisdropped) IS DISTINCT FROM 'integer[]' THEN
        RAISE EXCEPTION 'sg_report_page_one_runs.rendition_unmodelled_recids is missing or not integer[]';
    END IF;

    SELECT array_agg(conname::text ORDER BY conname::text COLLATE "C") INTO found_names
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'mandates.sg_report_page_one_outcomes'::regclass
      AND contype = 'c';
    IF found_names IS DISTINCT FROM ARRAY[
        'sg_report_page_one_outcomes_dispositions_when_no_docx',
        'sg_report_page_one_outcomes_issued_pdf_check_check',
        'sg_report_page_one_outcomes_outcome_check',
        'sg_report_page_one_outcomes_pdf_check_when_statements',
        'sg_report_page_one_outcomes_refusal_vocabulary',
        'sg_report_page_one_outcomes_refusal_when_refused',
        'sg_report_page_one_outcomes_rendition_format_check',
        'sg_report_page_one_outcomes_rendition_source_system_check',
        'sg_report_page_one_outcomes_rendition_when_held'
    ] THEN
        RAISE EXCEPTION 'sg_report_page_one_outcomes CHECK constraints are not as 044 leaves them: found %', found_names;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint
                   WHERE conrelid = 'mandates.sg_report_page_one_runs'::regclass
                     AND conname = 'sg_report_page_one_runs_v2_fields_together'
                     AND contype = 'c') THEN
        RAISE EXCEPTION 'sg_report_page_one_runs_v2_fields_together is missing';
    END IF;

    -- The dispositions tie now lives in dispositions_when_no_docx alone.
    SELECT array_agg(c.conname::text ORDER BY c.conname::text COLLATE "C") INTO found_names
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_attribute a
      ON a.attrelid = c.conrelid AND a.attname = 'acquisition_docx_dispositions'
    WHERE c.conrelid = 'mandates.sg_report_page_one_outcomes'::regclass
      AND c.contype = 'c'
      AND a.attnum = ANY (c.conkey);
    IF found_names IS DISTINCT FROM ARRAY['sg_report_page_one_outcomes_dispositions_when_no_docx'] THEN
        RAISE EXCEPTION 'CHECK constraints on acquisition_docx_dispositions are not as 044 leaves them: found %', found_names;
    END IF;

    -- Every existing row satisfies every CHECK on both tables. ADD CONSTRAINT
    -- has already scanned the rows; this re-runs each constraint's stored
    -- expression against them, so the check cannot drift from the
    -- constraints, and also fails on any constraint left NOT VALID. A CHECK
    -- passes on NULL, so a row violates it only where NOT (expression) is true.
    FOR con IN
        SELECT c.conrelid::regclass AS table_name, c.conname, c.convalidated,
               pg_catalog.pg_get_expr(c.conbin, c.conrelid) AS expression
        FROM pg_catalog.pg_constraint c
        WHERE c.conrelid IN ('mandates.sg_report_page_one_runs'::regclass,
                             'mandates.sg_report_page_one_outcomes'::regclass)
          AND c.contype = 'c'
    LOOP
        IF NOT con.convalidated THEN
            RAISE EXCEPTION '% on % is not validated', con.conname, con.table_name;
        END IF;
        EXECUTE format('SELECT count(*) FROM %s WHERE NOT (%s)', con.table_name, con.expression)
            INTO violating;
        IF violating > 0 THEN
            RAISE EXCEPTION '% rows of % violate %', violating, con.table_name, con.conname;
        END IF;
    END LOOP;

    -- Grants: the new columns are readable by mandates_readonly and writable,
    -- but not readable, by the writer, whose SELECT on runs stays on run_id.
    FOREACH column_name IN ARRAY ARRAY['converter_identity', 'rendition_unmodelled_recids'] LOOP
        IF NOT has_column_privilege('mandates_readonly',
                                    'mandates.sg_report_page_one_runs', column_name, 'SELECT') THEN
            RAISE EXCEPTION 'mandates_readonly cannot read sg_report_page_one_runs.%', column_name;
        END IF;
        IF NOT has_column_privilege('mandates_page_one_link_pipeline',
                                    'mandates.sg_report_page_one_runs', column_name, 'INSERT') THEN
            RAISE EXCEPTION 'mandates_page_one_link_pipeline cannot write sg_report_page_one_runs.%', column_name;
        END IF;
        IF has_column_privilege('mandates_page_one_link_pipeline',
                                'mandates.sg_report_page_one_runs', column_name, 'SELECT') THEN
            RAISE EXCEPTION 'mandates_page_one_link_pipeline can read sg_report_page_one_runs.%', column_name;
        END IF;
    END LOOP;
END
$$;
