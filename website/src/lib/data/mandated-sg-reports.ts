/**
 * The data for the "reports submitted under this mandate" block, from the
 * source MANDATED_SG_REPORTS_SOURCE names. The only reader of that flag:
 * pages call this and render MandatedSgReportsBlock, which follows the
 * `source` tag on the result rather than reading the flag again.
 */

import { MANDATED_SG_REPORTS_SOURCE } from '../feature-flags'
import { queryMany } from '../db/query'
import { resolutionFamilySql } from './mandated-sg-reports-sql'
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
    resolutionFamilySql,
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
