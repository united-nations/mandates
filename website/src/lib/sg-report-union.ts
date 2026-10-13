/**
 * The union of the two report-link sources for one mandate page, for display.
 *
 * Each source is read by its own function and stays the sole reader of its
 * tables: getSgReportsStatingResolution (page one, the report's own
 * statement) and getSgReportsMandatedByResolution (the Digital Library's
 * catalogue notes). Both are already scoped to the page's symbol, so a report
 * in both results is linked to this page by both sources; a report the
 * catalogue notes link to some other resolution is not in the catalogue
 * result here at all. This function only combines the two results. It runs
 * no query and is pure, so it is tested on its own.
 *
 * One row per report_recid:
 * - provenance: page_one, catalogue_notes or both;
 * - symbols: page one's report_symbols where page one has the report (every
 *   symbol the record carries), otherwise the catalogue-notes row's single
 *   report_symbol;
 * - title and date: both reads take them from the same
 *   digitallibrary.documents row by recid, so for a report in both they are
 *   equal. A difference is not resolved here: it throws, naming the report;
 * - catalogueAnnexOnly: the catalogue-notes row's annex_position_only, or
 *   null when the catalogue notes do not have the report.
 *
 * Each read returns a report at most once; a report twice in one result
 * would otherwise be counted as found by both sources, so it throws. The
 * catalogue-notes read groups by report_symbol as well as recid, which is
 * how a second row could arise.
 *
 * Rows are ordered as both reads order them: newest date first, undated
 * last, then by symbols, then by recid.
 *
 * With no accepted page-one run the rows are the catalogue-notes rows, each
 * labelled as such, and pageOneAccepted is false so the block can say so.
 */

import type { MandatedSgReport } from './data/sg-report-links'
import type { PageOneSgReports } from './data/sg-report-page-one-links'

export type SgReportProvenance = 'page_one' | 'catalogue_notes' | 'both'

export interface UnionSgReport {
  report_recid: number
  symbols: string[]
  title: string | null
  date_published: string | null
  provenance: SgReportProvenance
  catalogueAnnexOnly: boolean | null
}

export interface UnionSgReports {
  pageOneAccepted: boolean
  reports: UnionSgReport[]
}

function compareSymbols(a: string[], b: string[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1
  }
  return a.length - b.length
}

function compareRows(a: UnionSgReport, b: UnionSgReport): number {
  if (a.date_published !== b.date_published) {
    if (a.date_published === null) return 1
    if (b.date_published === null) return -1
    return a.date_published < b.date_published ? 1 : -1
  }
  return compareSymbols(a.symbols, b.symbols) || a.report_recid - b.report_recid
}

export function unionSgReports(
  pageOne: PageOneSgReports,
  catalogue: MandatedSgReport[]
): UnionSgReports {
  const rows = new Map<number, UnionSgReport>()

  if (pageOne.acceptedRunId !== null) {
    for (const report of pageOne.reports) {
      if (rows.has(report.report_recid)) {
        throw new Error(
          `SG report ${report.report_recid}: the page-one read returned it twice`
        )
      }
      rows.set(report.report_recid, {
        report_recid: report.report_recid,
        symbols: report.report_symbols,
        title: report.title,
        date_published: report.date_published,
        provenance: 'page_one',
        catalogueAnnexOnly: null,
      })
    }
  }

  for (const report of catalogue) {
    const row = rows.get(report.report_recid)
    if (row === undefined) {
      rows.set(report.report_recid, {
        report_recid: report.report_recid,
        symbols: [report.report_symbol],
        title: report.title,
        date_published: report.date_published,
        provenance: 'catalogue_notes',
        catalogueAnnexOnly: report.annex_position_only,
      })
      continue
    }
    if (row.provenance !== 'page_one') {
      throw new Error(
        `SG report ${report.report_recid}: the catalogue-notes read returned it twice`
      )
    }
    if (
      row.title !== report.title ||
      row.date_published !== report.date_published
    ) {
      throw new Error(
        `SG report ${report.report_recid}: page one and the catalogue notes read different titles or dates from the same catalogue record`
      )
    }
    row.provenance = 'both'
    row.catalogueAnnexOnly = report.annex_position_only
  }

  return {
    pageOneAccepted: pageOne.acceptedRunId !== null,
    reports: [...rows.values()].sort(compareRows),
  }
}
