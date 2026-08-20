/**
 * @file Budget-hierarchy citation SQL
 * @description Builds citation-first rows before hierarchy grouping.
 *
 * Key exports:
 * - buildDirectBudgetCitations() - Filters the small version citation set.
 * - buildQualifiedBudgetCitations() - Preserves count-filter semantics.
 */

interface DirectCitationOptions {
  subprogramme: string
  versionClause: string
  whereClause: string
}

interface QualifiedCitationOptions {
  subprogramme: string
  versionClause: string
}

const projection = (subprogramme: string): string => `
    c.ppb_full_document_symbol AS sym,
    c.budget_part_number, c.section, c.section_title,
    c.programme, c.programme_title, c.entity,
    ${subprogramme} AS sub_programme, c.sub_programme_number,
    bd.doc_type, bd.display_name AS stream_label, bd.sort_order AS stream_sort,
    (c.section_title LIKE 'Administrative and budgetary aspects%') AS is_support`

const filterSuffix = (whereClause: string): string =>
  whereClause ? ` AND ${whereClause.replace(/^WHERE\s+/i, '')}` : ''

/** Builds citation-first rows for filters without citation-count HAVING. */
export const buildDirectBudgetCitations = (
  options: DirectCitationOptions
): string => `cites AS MATERIALIZED (
  SELECT ${projection(options.subprogramme)}
  FROM ppb2026.source_document_citations c
  JOIN ppb2026.budget_documents bd
    ON c.origin_document ~ bd.match_pattern
  JOIN public.unified_documents d
    ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
  WHERE ${options.versionClause}${filterSuffix(options.whereClause)}
)`

/** Builds rows from prequalified documents when min/max counts are active. */
export const buildQualifiedBudgetCitations = (
  options: QualifiedCitationOptions
): string => `cites AS MATERIALIZED (
  SELECT ${projection(options.subprogramme)}
  FROM ppb2026.source_document_citations c
  JOIN ppb2026.budget_documents bd
    ON c.origin_document ~ bd.match_pattern
  JOIN filtered_docs fd
    ON fd.ppb_full_document_symbol = c.ppb_full_document_symbol
  WHERE ${options.versionClause}
)`
