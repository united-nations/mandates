import { versionPredicateSql } from '#lib/mandate-membership'

/** Website budget-family memberships and the explicit primary display priority.
 * Source memberships remain independent for filtering. $2/$3 name the programme-budget citation sections.
 */
export const citationCategoryCtes = `citation_sections AS (
  SELECT c.ppb_full_document_symbol,
         BOOL_OR(bd.doc_type = 'ppb' AND c.part_in_document = $2) AS foundational,
         BOOL_OR(bd.doc_type = 'ppb' AND c.part_in_document = $3) AS legislative,
         BOOL_OR(bd.doc_type = 'pko') AS peacekeeping,
         BOOL_OR(bd.doc_type = 'plan_outline') AS plan_outline
  FROM ppb2026.source_document_citations c
  LEFT JOIN ppb2026.budget_documents bd ON c.origin_document ~ bd.match_pattern
  WHERE ${versionPredicateSql('c', '$1')}
  GROUP BY c.ppb_full_document_symbol
), classified_citations AS (
  SELECT ppb_full_document_symbol,
         array_remove(ARRAY[
           CASE WHEN foundational IS TRUE THEN 'foundational' END,
           CASE WHEN legislative IS TRUE THEN 'legislative' END,
           CASE WHEN peacekeeping IS TRUE THEN 'peacekeeping' END,
           CASE WHEN plan_outline IS TRUE THEN 'planOutline' END
         ], NULL) AS categories,
         CASE WHEN peacekeeping IS TRUE THEN 'peacekeeping'
              WHEN foundational IS TRUE THEN 'foundational'
              WHEN legislative IS TRUE THEN 'legislative'
              WHEN plan_outline IS TRUE THEN 'planOutline'
              ELSE 'unsupported' END AS primary_category
  FROM citation_sections
)`
