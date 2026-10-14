-- 042: Repair PPB 2027 short-reference document collisions (issue #29).
-- MANUAL APPLY ONLY, from the repo root using psql -v ON_ERROR_STOP=1.
-- Uses the checked-in provenance map, NOT the currently merged document body's
-- metadata. Leaves PPB 2026, review data, paragraphs and old document rows intact.
-- Re-runnable: already-reassigned citations no longer match old_key.
-- Scope is the confirmed bare numeric class. Other aliases are left for a
-- separate deduplication change. No citation IDs are changed. Ambiguous mappings or duplicate target citations
-- require provenance review rather than loss. Ambiguous issuer mappings abort;
-- exact duplicate target aliases are reported and skipped.
-- Schema counterpart: source_documents_no_bare_numeric_key in schema/ppb2026.sql.

\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE _identity_repair (
    old_key text, origin_document text, entity text, section text,
    part_in_document text, subprogramme text, new_key text, source text,
    description text, symbol text, link text, organ text, official boolean
) ON COMMIT DROP;
\copy _identity_repair FROM 'data/processed/ppb2027/mandate_identity_repair.csv' WITH (FORMAT csv, HEADER true);

-- Map each existing citation using its original budget provenance. CSV sections
-- carry addenda separately; this repair map already folds them into section.
CREATE TEMP TABLE _identity_matches ON COMMIT DROP AS
SELECT DISTINCT c.id, r.new_key
FROM ppb2026.source_document_citations c
JOIN _identity_repair r
  ON c.ppb_full_document_symbol = r.old_key
 AND c.origin_document = r.origin_document
 AND c.entity = r.entity
 AND coalesce(c.section, '') = coalesce(r.section, '')
 AND coalesce(c.part_in_document, '') = coalesce(r.part_in_document, '')
 AND c.sub_programme_number IS NOT DISTINCT FROM nullif(r.subprogramme, '')::smallint
WHERE r.origin_document = 'PPB 2027'
  AND r.old_key ~ '^[0-9]+/[0-9]+$' AND r.old_key <> r.new_key;

DO $guard$
BEGIN
    IF EXISTS (SELECT id FROM _identity_matches GROUP BY id HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'Ambiguous citation provenance; no changes applied';
    END IF;
    IF EXISTS (SELECT 1 FROM _identity_repair WHERE new_key ~ '^[0-9]+/[0-9]+$') THEN
        RAISE EXCEPTION 'Repair contains unresolved numeric identities';
    END IF;
END
$guard$;

-- Collision guard covers the complete natural key, including already-canonical
-- citations. Never silently delete an existing citation to make an UPDATE fit.
CREATE TEMP TABLE _identity_projected ON COMMIT DROP AS
SELECT c.*, coalesce(m.new_key, c.ppb_full_document_symbol) AS target_key
FROM ppb2026.source_document_citations c
LEFT JOIN _identity_matches m ON m.id = c.id;


-- Keep existing citation IDs when a canonical counterpart already occupies the
-- target natural key. This deliberately leaves that alias for a separate merge.
CREATE TEMP TABLE _identity_skipped ON COMMIT DROP AS
SELECT DISTINCT p.id, p.ppb_full_document_symbol, p.target_key
FROM _identity_projected p
JOIN _identity_matches m ON m.id = p.id
JOIN _identity_projected other ON p.id <> other.id
 AND ROW(p.target_key, p.entity, coalesce(p.origin_document, ''),
         coalesce(p.part_in_document, ''), coalesce(p.section, ''),
         coalesce(p.section_title, ''), coalesce(p.priority_area, ''),
         coalesce(p.sub_programme, ''), coalesce(p.pillar, ''),
         coalesce(p.budget_part, ''), coalesce(p.programme::integer, -1),
         coalesce(p.programme_title, ''), coalesce(p.component, ''))
 IS NOT DISTINCT FROM
     ROW(other.target_key, other.entity, coalesce(other.origin_document, ''),
         coalesce(other.part_in_document, ''), coalesce(other.section, ''),
         coalesce(other.section_title, ''), coalesce(other.priority_area, ''),
         coalesce(other.sub_programme, ''), coalesce(other.pillar, ''),
         coalesce(other.budget_part, ''), coalesce(other.programme::integer, -1),
         coalesce(other.programme_title, ''), coalesce(other.component, ''));
UPDATE _identity_projected p SET target_key = p.ppb_full_document_symbol
FROM _identity_skipped s WHERE p.id = s.id;
DELETE FROM _identity_matches m USING _identity_skipped s WHERE m.id = s.id;

DO $guard$
BEGIN
    IF EXISTS (
        SELECT target_key FROM _identity_projected
        GROUP BY target_key, entity, coalesce(origin_document, ''),
                 coalesce(part_in_document, ''), coalesce(section, ''),
                 coalesce(section_title, ''), coalesce(priority_area, ''),
                 coalesce(sub_programme, ''), coalesce(pillar, ''),
                 coalesce(budget_part, ''), coalesce(programme::integer, -1),
                 coalesce(programme_title, ''), coalesce(component, '')
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Repair would merge citation natural keys; no changes applied';
    END IF;
END
$guard$;

-- Register only identities which an existing citation actually needs.
INSERT INTO ppb2026.source_documents (
    ppb_full_document_symbol, ppb_document_source, ppb_description, ppb_symbol,
    ppb_link, ppb_body, ppb_not_ods, ppb_full_doc_symbol_available
)
SELECT DISTINCT ON (r.new_key)
    r.new_key, r.source, r.description, r.symbol, nullif(r.link, ''),
    nullif(r.organ, ''), CASE WHEN r.official THEN 'false' ELSE 'true' END,
    CASE WHEN r.official THEN 'TRUE' ELSE 'IN REPORT' END
FROM _identity_repair r
JOIN _identity_matches m ON m.new_key = r.new_key
ORDER BY r.new_key, r.source, r.description
ON CONFLICT (ppb_full_document_symbol) DO NOTHING;

UPDATE ppb2026.source_document_citations c
SET ppb_full_document_symbol = m.new_key
FROM _identity_matches m WHERE c.id = m.id;

-- Every citation, including all unaffected columns, must survive byte-for-byte
-- except for its intended document identity. Both EXCEPT directions are checked.
DO $guard$
BEGIN
    IF EXISTS (
        (SELECT to_jsonb(c) FROM ppb2026.source_document_citations c
         EXCEPT
         SELECT (to_jsonb(p) - 'target_key') ||
                jsonb_build_object('ppb_full_document_symbol', p.target_key)
         FROM _identity_projected p)
        UNION ALL
        (SELECT (to_jsonb(p) - 'target_key') ||
                jsonb_build_object('ppb_full_document_symbol', p.target_key)
         FROM _identity_projected p
         EXCEPT SELECT to_jsonb(c) FROM ppb2026.source_document_citations c)
    ) THEN
        RAISE EXCEPTION 'Citation conservation failed; no changes applied';
    END IF;
END
$guard$;

-- Guard new imports while permitting legacy orphan keys to remain recoverable.
DO $constraint$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conrelid = 'ppb2026.source_documents'::regclass
                     AND conname = 'source_documents_no_bare_numeric_key') THEN
        ALTER TABLE ppb2026.source_documents
            ADD CONSTRAINT source_documents_no_bare_numeric_key
            CHECK (ppb_full_document_symbol !~ '^[0-9]+/[0-9]+$') NOT VALID;
    END IF;
END
$constraint$;

REFRESH MATERIALIZED VIEW public.unified_documents;
SELECT count(*) AS citations_reassigned FROM _identity_matches;
SELECT * FROM _identity_skipped ORDER BY id;
SELECT count(*) AS remaining_bare_numeric_citations
FROM ppb2026.source_document_citations
WHERE origin_document = 'PPB 2027'
  AND ppb_full_document_symbol ~ '^[0-9]+/[0-9]+$';
COMMIT;
