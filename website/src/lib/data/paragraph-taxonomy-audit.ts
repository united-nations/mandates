/** Legacy extraction coverage/counts and current deterministic taxonomy, registry only. */
import { queryMany } from '#lib/db/query'
import { mandateMembershipSql } from '#lib/mandate-membership'

export interface TaxonomyAuditRow {
  scope: string
  kind: string
  category: string | null
  subtype: string | null
  occurrences: string
  paragraphs: string
  documents: string
  inherited_paragraphs?: string
  not_inherited_paragraphs?: string
}

export const paragraphTaxonomyAuditSql = `
WITH registry AS (
  SELECT DISTINCT upper(regexp_replace(d.ppb_full_document_symbol, '\\s', '', 'g')) symbol
  FROM public.unified_documents d WHERE ${mandateMembershipSql('d', '$1')}
), scope_symbols AS (
  SELECT r.symbol, s.scope FROM registry r
  CROSS JOIN (VALUES ('registry'), ('cohort'), ('sample')) s(scope)
  WHERE s.scope = 'registry' OR (s.scope = 'cohort' AND r.symbol = ANY($2::text[]))
    OR (s.scope = 'sample' AND r.symbol = ANY($3::text[]))
), legacy AS (
  SELECT s.scope,s.symbol,p.* FROM mandates.paragraphs p
  JOIN scope_symbols s ON s.symbol = upper(regexp_replace(p.document_symbol, '\\s', '', 'g'))
  WHERE p.type='paragraph' AND p.paragraph_type='operative'
)
SELECT scope,'legacy_coverage' kind,NULL::text category,NULL::text subtype,
  count(*)::text occurrences,count(*)::text paragraphs,count(DISTINCT symbol)::text documents
FROM legacy GROUP BY scope
UNION ALL
SELECT scope,'legacy_annotated' kind,NULL,NULL,count(*)::text,count(*)::text,count(DISTINCT symbol)::text
FROM legacy WHERE mandates IS NOT NULL AND mandates::text NOT IN ('[]','null') GROUP BY scope
UNION ALL
SELECT p.scope,'deliverable',coalesce(nullif(d.deliverable_type,''),'[unclassified]'),NULL,
  count(*)::text,count(DISTINCT p.id)::text,count(DISTINCT p.symbol)::text
FROM legacy p JOIN mandates.paragraph_mandates m ON m.paragraph_id=p.id
JOIN mandates.mandate_deliverables d ON d.mandate_id=m.id GROUP BY p.scope,d.deliverable_type
UNION ALL
SELECT p.scope,'assignee',coalesce(nullif(a.assignee_type,''),'[unclassified]'),NULL,
  count(*)::text,count(DISTINCT p.id)::text,count(DISTINCT p.symbol)::text
FROM legacy p JOIN mandates.paragraph_mandates m ON m.paragraph_id=p.id
JOIN mandates.mandate_assignees a ON a.mandate_id=m.id GROUP BY p.scope,a.assignee_type
UNION ALL
SELECT p.scope,'mentioned_entity',coalesce(nullif(e.mentioned_entity_type,''),'[unclassified]'),NULL,
  count(*)::text,count(DISTINCT p.id)::text,count(DISTINCT p.symbol)::text
FROM legacy p JOIN mandates.paragraph_mandates m ON m.paragraph_id=p.id
JOIN mandates.mandate_entities e ON e.mandate_id=m.id GROUP BY p.scope,e.mentioned_entity_type
UNION ALL
SELECT p.scope,'legacy_action',coalesce(nullif(m.action_verb_type,''),'[unclassified]'),m.action_verb_normalized,
  count(*)::text,count(DISTINCT p.id)::text,count(DISTINCT p.symbol)::text
FROM legacy p JOIN mandates.paragraph_mandates m ON m.paragraph_id=p.id
GROUP BY p.scope,m.action_verb_type,m.action_verb_normalized
UNION ALL
SELECT p.scope,'assignee_name',coalesce(nullif(a.assignee_type,''),'[unclassified]'),a.assignee_normalized,
  count(*)::text,count(DISTINCT p.id)::text,count(DISTINCT p.symbol)::text
FROM legacy p JOIN mandates.paragraph_mandates m ON m.paragraph_id=p.id
JOIN mandates.mandate_assignees a ON a.mandate_id=m.id
GROUP BY p.scope,a.assignee_type,a.assignee_normalized
ORDER BY scope,kind,category,subtype
`

export const deterministicTaxonomyAuditSql = `
WITH registry AS (
  SELECT DISTINCT upper(regexp_replace(d.ppb_full_document_symbol, '\\s', '', 'g')) symbol
  FROM public.unified_documents d WHERE ${mandateMembershipSql('d', '$1')}
), scope_symbols AS (
  SELECT r.symbol, s.scope FROM registry r
  CROSS JOIN (VALUES ('registry'), ('cohort'), ('sample')) s(scope)
  WHERE s.scope = 'registry' OR (s.scope = 'cohort' AND r.symbol = ANY($2::text[]))
    OR (s.scope = 'sample' AND r.symbol = ANY($3::text[]))
), operative AS (
  SELECT s.scope,s.symbol,dp.id,dp.action_verb_normalized,dp.action_verb,
    dp.action_category,dp.action_inherited,dp.assignee_class
  FROM scope_symbols s JOIN digitallibrary.document_paragraphs dp ON dp.symbol_normalized=s.symbol
  JOIN digitallibrary.document_files f ON f.symbol_normalized=dp.symbol_normalized AND f.lang=dp.lang AND f.status='parsed'
  JOIN digitallibrary.document_parses p ON p.symbol_normalized=dp.symbol_normalized AND p.lang=dp.lang
  WHERE dp.lang='en' AND dp.type='paragraph' AND dp.paragraph_type='operative'
), dimensions AS (
 SELECT o.*,d.kind,d.category,d.subtype FROM operative o
 CROSS JOIN LATERAL (VALUES
  ('deterministic_coverage','all','operative'),
  ('deterministic_action',coalesce(o.action_category,'[unclassified]'),'operative'),
  ('deterministic_verb',coalesce(o.action_category,'[unclassified]'),
   coalesce(nullif(lower(trim(o.action_verb_normalized)),''),nullif(lower(trim(o.action_verb)),''),'[none]')),
  ('deterministic_assignee',coalesce(nullif(o.assignee_class,''),'[none]'),NULL)
 ) d(kind,category,subtype)
)
SELECT scope,kind,category,subtype,count(*)::text occurrences,
 count(DISTINCT id)::text paragraphs,count(DISTINCT symbol)::text documents,
 count(*) FILTER (WHERE action_inherited IS TRUE)::text inherited_paragraphs,
 count(*) FILTER (WHERE action_inherited IS NOT TRUE)::text not_inherited_paragraphs
FROM dimensions GROUP BY scope,kind,category,subtype
ORDER BY scope,kind,category,subtype
`

export function getParagraphTaxonomyAudit(
  version: string,
  cohort: string[],
  sample: string[]
) {
  return queryMany<TaxonomyAuditRow>(paragraphTaxonomyAuditSql, [
    version,
    cohort,
    sample,
  ])
}

export function getDeterministicTaxonomyAudit(
  version: string,
  cohort: string[],
  sample: string[]
) {
  return queryMany<TaxonomyAuditRow>(deterministicTaxonomyAuditSql, [
    version,
    cohort,
    sample,
  ])
}

export interface AnalysisParagraph {
  symbol: string
  id: string
  position: number
  type: string
  text: string
  paragraph_type: string | null
  level: number | null
  prefix: string | null
  action_verb: string | null
  action_verb_normalized: string | null
  action_category: string | null
  action_inherited: boolean | null
  section: string | null
  annex_index: number | null
  text_index: number | null
  parser_version: string
}

export const sampledAnalysisParagraphsSql = `
SELECT dp.symbol_normalized symbol,dp.id,dp.position,dp.type,dp.text,dp.paragraph_type,
 dp.level,dp.prefix,dp.action_verb,dp.action_verb_normalized,dp.action_category,
 dp.action_inherited,dp.section,dp.annex_index,dp.text_index,p.parser_version
FROM digitallibrary.document_paragraphs dp
JOIN digitallibrary.document_files f ON f.symbol_normalized=dp.symbol_normalized AND f.lang=dp.lang AND f.status='parsed'
JOIN digitallibrary.document_parses p ON p.symbol_normalized=dp.symbol_normalized AND p.lang=dp.lang
WHERE dp.lang='en' AND dp.symbol_normalized=ANY($1::text[])
 AND dp.type IN ('paragraph','opening','title','heading','table')
ORDER BY dp.symbol_normalized,dp.position
`

export function getSampledAnalysisParagraphs(symbols: string[]) {
  return queryMany<AnalysisParagraph>(sampledAnalysisParagraphsSql, [symbols])
}
