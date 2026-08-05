/**
 * SG-report ↔ mandating-resolution link reads — the "reports submitted under
 * this mandate" block on a mandate detail view.
 *
 * Backed by mandates.sg_report_to_mandate_links: one row per citation
 * occurrence extracted from the report's UN Digital Library catalogue notes
 * ("Submitted pursuant to resolution X") by
 * data-processing/report_mandate_links/. The table stores occurrences; the
 * one-entry-per-report shape returned here is the display grain, collapsed in
 * SQL.
 *
 * THE JOIN
 * --------
 * The page's own symbol is tested byte-exactly against
 * resolution_display_candidates — the precomputed set of registry page symbols
 * each stored resolution identity resolves to. No symbol normalisation happens
 * here: the fold that maps prose variants to one stored identity ran once, at
 * write time, and the candidates array is that fold's inverse image. A page
 * created after the last extractor run matches no rows until the next run;
 * the control is run cadence, not read-time widening.
 *
 * DISPLAY SCOPE
 * -------------
 * One read-time predicate over stored bytes: the citation_sense allowlist —
 * the display-eligible senses. body_established is held from display (the
 * resolution established the reporting body; the report is not the SG
 * answering the resolution), and prst_note_decision rows are diverted (the
 * cited instrument is a presidential statement, not a resolution). An
 * allowlist so that any future sense value defaults to captured-not-displayed.
 */

import { cache } from 'react'
import { queryMany } from '../db/query'

/** The display-eligible citation senses (see DISPLAY SCOPE above). */
const DISPLAY_ELIGIBLE_SENSES = [
  'direct_request',
  'founding_renewal',
  'additional_joint',
  'activities_carried_out',
]

export interface MandatedSgReport {
  report_recid: number
  report_symbol: string
  title: string | null
  /**
   * ISO date string, cast to text in SQL — node-postgres would otherwise
   * parse a DATE column into a local-time JS Date.
   */
  date_published: string | null
  /**
   * Every display-eligible occurrence for this report sits in an
   * annex-description title: the annex, not the report itself, was submitted
   * pursuant to this resolution, and the UI renders distinct prose for it.
   */
  annex_position_only: boolean
}

/**
 * Secretary-General reports mandated by the resolution shown at `pageSymbol`
 * (the page's own ppb_full_document_symbol, byte-exact), newest first. One
 * entry per report; empty array when the resolution has none in display
 * scope. Report title and date come from digitallibrary.documents via
 * report_recid — the same join getResolutionSeries uses.
 */
export const getSgReportsMandatedByResolution = cache(
  async (pageSymbol: string): Promise<MandatedSgReport[]> => {
    return queryMany<MandatedSgReport>(
      `SELECT l.report_recid,
              l.report_symbol,
              d.title,
              d.date_publication::text AS date_published,
              bool_and(l.citation_position = 'annex_title') AS annex_position_only
       FROM mandates.sg_report_to_mandate_links l
       JOIN digitallibrary.documents d ON d.recid = l.report_recid
       WHERE $1 = ANY (l.resolution_display_candidates)
         AND l.citation_sense = ANY ($2)
       GROUP BY l.report_recid, l.report_symbol, d.title, d.date_publication
       ORDER BY d.date_publication DESC NULLS LAST, l.report_symbol`,
      [pageSymbol, DISPLAY_ELIGIBLE_SENSES]
    )
  }
)
