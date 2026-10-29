/**
 * Page-one SG-report ↔ mandate link reads — the reports that state, on their
 * own first pages, that they were submitted under the resolution on view.
 *
 * Backed by the tables of sql/migrations/043_sg_report_page_one_links.sql:
 * sg_report_page_one_links (one row per citation the extractor kept from a
 * linked report) and sg_report_page_one_outcomes (one row per report per
 * run, carrying the report's symbols). A second source beside
 * lib/data/sg-report-links.ts, which reads the Digital Library catalogue
 * notes; this file follows its conventions and changes nothing there.
 *
 * WHICH RUN
 * ---------
 * Rows are kept per run and never replaced, so every read is scoped to one
 * run: the run named by the acceptance with the latest accepted_at, ties
 * broken by the higher acceptance_id (the rule the migration states on
 * sg_report_page_one_run_acceptances and applies in the view
 * sg_report_page_one_vs_stage1). Not the highest run_id: rolling back is a
 * new acceptance naming an older run. With no acceptance row there is
 * nothing this source may show, and the result says so (acceptedRunId null)
 * rather than reading as a resolution with no reports.
 *
 * THE JOIN
 * --------
 * Family symbols match cited_display_candidates byte-exactly, or their stored
 * catalogue symbol_normalized identity matches cited_canonical. The latter
 * includes historical family members with no registry page candidates. Calls
 * without family targets retain the original single-page candidates match.
 *
 * DISPLAY SCOPE
 * -------------
 * Only the three mandating citation roles. additional and context citations
 * are stored for audit and comparison and are not links (column comment on
 * citation_role). Every instrument kind is in scope: a decision or
 * presidential statement shows on its own registry page if it has one.
 *
 * Nothing the extractor read from the report is returned: no statement_text,
 * cited_prose, relation phrase or pinpoint. The block shows which reports,
 * not what they say.
 *
 * MIRRORED IN THE DATABASE
 * ------------------------
 * The view mandates.sg_report_page_one_vs_stage1_keys takes the same roles
 * and the same non-empty-candidates rule for page one's side of its
 * comparison. A change to PAGE_ONE_DISPLAYED_CITATION_ROLES or to the
 * single-page candidates match here must be made in that view too; family
 * expansion is outside that per-page diagnostic scope.
 */

import { cache } from 'react'
import { queryMany, queryOne } from '../db/query'
import type { SgReportResolutionTarget } from './sg-report-links'

/** The citation roles shown as links (see DISPLAY SCOPE above). */
const PAGE_ONE_DISPLAYED_CITATION_ROLES = [
  'mandating',
  'mandating_founding',
  'mandating_most_recent',
]

export interface PageOneSgReport {
  report_recid: number
  /**
   * Every document symbol the report's Digital Library record carries, in
   * the record's order: two for a report issued to two organs, shown as two
   * chips. Never empty here (checked on read).
   */
  report_symbols: string[]
  title: string | null
  /** ISO date string, cast to text in SQL, as in the catalogue-notes read. */
  date_published: string | null
  /** Exact family member symbols matched by this source's stored candidates. */
  resolution_symbols?: string[]
}

export type PageOneSgReports =
  | { acceptedRunId: null }
  | { acceptedRunId: string; reports: PageOneSgReport[] }

/**
 * The run_id the display reads, or null when no run has been accepted.
 * BIGINT, so node-postgres returns it as a string; it is only passed back
 * as a query parameter.
 */
const getAcceptedPageOneRunId = cache(async (): Promise<string | null> => {
  const row = await queryOne<{ run_id: string }>(
    `/* trace:sg-reports.page-one.accepted-run */
     SELECT a.run_id
     FROM mandates.sg_report_page_one_run_acceptances a
     ORDER BY a.accepted_at DESC, a.acceptance_id DESC
     LIMIT 1`
  )
  return row ? row.run_id : null
})

/**
 * Secretary-General reports whose first pages state they were submitted
 * under any requested family member (or just `pageSymbol` by default), with
 * byte-exact candidate matching, in the accepted run, newest first.
 * One entry per report.
 *
 * Title and date come from digitallibrary.documents by report_recid. The
 * join is LEFT because the link is the run's statement, not the catalogue's:
 * a report the run links is listed even if its catalogue row cannot supply a
 * title or date, and those then render as absent.
 */
export async function getPageOneReportsMany(
  targets: { page_symbol: string; symbol: string; canonical: string | null }[]
): Promise<Map<string, PageOneSgReports>> {
  const symbols = [...new Set(targets.map(target => target.page_symbol))]
    const acceptedRunId = await getAcceptedPageOneRunId()
    if (acceptedRunId === null) {
      console.warn(
        'Page-one SG report links: no accepted run in mandates.sg_report_page_one_run_acceptances; mandate pages show the not-accepted state'
      )
      return new Map(symbols.map(symbol => [symbol, { acceptedRunId: null }]))
    }

    const reports = await queryMany<PageOneSgReport & { page_symbol: string }>(
      `/* trace:sg-reports.page-one.by-mandate */
       SELECT matched.page_symbol, o.report_recid,
              o.report_symbols,
              d.title,
              d.date_publication::text AS date_published,
              array_agg(DISTINCT matched.symbol ORDER BY matched.symbol) AS resolution_symbols
       FROM mandates.sg_report_page_one_links l
       JOIN mandates.sg_report_page_one_outcomes o
         ON o.run_id = l.run_id AND o.report_recid = l.report_recid
       LEFT JOIN digitallibrary.documents d ON d.recid = l.report_recid
       JOIN jsonb_to_recordset($2::jsonb) matched(page_symbol text, symbol text, canonical text)
         ON matched.symbol = ANY (l.cited_display_candidates)
         OR matched.canonical = l.cited_canonical
       WHERE l.run_id = $1
         AND l.citation_role = ANY ($3)
       GROUP BY matched.page_symbol, o.report_recid, o.report_symbols, d.title, d.date_publication
       ORDER BY d.date_publication DESC NULLS LAST, o.report_symbols, o.report_recid`,
      [acceptedRunId, JSON.stringify(targets), PAGE_ONE_DISPLAYED_CITATION_ROLES]
    )

    // The schema allows {} (a catalogue record with no symbol), and the
    // accepted run has such outcomes, all refused. A linked one would render
    // as a link with no text, so it stops the page instead.
    for (const report of reports) {
      if (!report.resolution_symbols?.length) {
        throw new Error(`Page-one SG report ${report.report_recid}: missing resolution linkage data`)
      }
      if (report.report_symbols.length === 0) {
        throw new Error(
          `Page-one SG report links: report ${report.report_recid} in run ${acceptedRunId} is linked to ${report.page_symbol} but has no document symbol`
        )
      }
    }

    return new Map(symbols.map(symbol => [symbol, { acceptedRunId,
      reports: reports.filter(report => report.page_symbol === symbol).map(row => { const report = { ...row }; Reflect.deleteProperty(report, 'page_symbol'); return report })
    }]))
}
export const getSgReportsStatingResolution = cache(async (
  pageSymbol: string,
  familyTargets: SgReportResolutionTarget[] = [{ symbol: pageSymbol, canonical: null }]
): Promise<PageOneSgReports> => (await getPageOneReportsMany(familyTargets.map(target => ({ ...target, page_symbol: pageSymbol })))).get(pageSymbol) ?? { acceptedRunId: null })
