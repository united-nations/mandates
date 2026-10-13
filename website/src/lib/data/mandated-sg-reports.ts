/**
 * The data for the "reports submitted under this mandate" block, from the
 * source MANDATED_SG_REPORTS_SOURCE names. The only reader of that flag:
 * pages call this and render MandatedSgReportsBlock, which follows the
 * `source` tag on the result rather than reading the flag again.
 */

import { MANDATED_SG_REPORTS_SOURCE } from '../feature-flags'
import { queryMany } from '../db/query'
import { unionSgReports, type UnionSgReports } from '../sg-report-union'
import {
  getSgReportsMandatedByResolution,
  type MandatedSgReport,
  type SgReportResolutionTarget,
} from './sg-report-links'
import {
  getSgReportsStatingResolution,
  type PageOneSgReports,
} from './sg-report-page-one-links'

export type MandatedSgReports =
  | { source: 'catalogue_notes'; reports: MandatedSgReport[] }
  | { source: 'page_one'; data: PageOneSgReports }
  | { source: 'union'; data: UnionSgReports }

export async function getMandatedSgReports(
  pageSymbol: string
): Promise<MandatedSgReports> {
  // Catalogue symbol_normalized is the extractor's stored canonical identity.
  // The whitespace/case lookup follows migration 035's registry/catalogue join.
  // Collections are groups of related documents, never versions of a mandate.
  const family = await queryMany<SgReportResolutionTarget>(
    `/* trace:sg-reports.resolution-family */
     WITH me AS (
       SELECT DISTINCT rs.series_key, rs.un_body, rs.doc_type, rs.is_collection
       FROM digitallibrary.resolution_series rs
       JOIN digitallibrary.documents d ON d.recid = rs.recid
       WHERE rs.document_symbol = $1
          OR d.symbol_normalized = upper(regexp_replace($1, '[[:space:]]', '', 'g'))
     )
     SELECT DISTINCT ON (COALESCE(d.symbol_normalized, rs.document_symbol))
       CASE WHEN d.symbol_normalized = upper(regexp_replace($1, '[[:space:]]', '', 'g'))
         THEN $1 ELSE rs.document_symbol END AS symbol,
       d.symbol_normalized AS canonical
     FROM me
     JOIN digitallibrary.resolution_series rs
       ON rs.series_key = me.series_key
      AND rs.un_body = me.un_body
      AND rs.doc_type = me.doc_type
     JOIN digitallibrary.documents d ON d.recid = rs.recid
     WHERE (SELECT count(*) FROM me) = 1
       AND (NOT me.is_collection
         OR d.symbol_normalized = upper(regexp_replace($1, '[[:space:]]', '', 'g')))
     ORDER BY COALESCE(d.symbol_normalized, rs.document_symbol), rs.document_symbol`,
    [pageSymbol]
  )
  const targets: SgReportResolutionTarget[] = [
    ...family,
    ...(!family.some((target) => target.symbol === pageSymbol)
      ? [{ symbol: pageSymbol, canonical: null }]
      : []),
  ]
  switch (MANDATED_SG_REPORTS_SOURCE) {
    case 'catalogue_notes':
      return {
        source: 'catalogue_notes',
        reports: await getSgReportsMandatedByResolution(pageSymbol, targets),
      }
    case 'page_one':
      return {
        source: 'page_one',
        data: await getSgReportsStatingResolution(pageSymbol, targets),
      }
    case 'union': {
      const [pageOne, catalogue] = await Promise.all([
        getSgReportsStatingResolution(pageSymbol, targets),
        getSgReportsMandatedByResolution(pageSymbol, targets),
      ])
      return { source: 'union', data: unionSgReports(pageOne, catalogue) }
    }
  }
}
