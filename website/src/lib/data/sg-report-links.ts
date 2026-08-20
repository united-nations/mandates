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
 * Two read-time predicates over stored bytes; the table itself keeps every
 * extracted occurrence, so a rule here narrows what is shown, never what is
 * stored.
 *
 * First, the citation_sense allowlist — the display-eligible senses.
 * body_established is held from display (the resolution established the
 * reporting body; the report is not the SG answering the resolution), and
 * prst_note_decision rows are diverted (the cited instrument is a
 * presidential statement, not a resolution). An allowlist so that any future
 * sense value defaults to captured-not-displayed.
 *
 * Second, a four-entry report_recid exclusion — duplicate Digital Library
 * catalogue records. Each excluded recid is a second catalogue record of a
 * report that already renders on the same page under its clean symbol;
 * showing both would list one document twice. The rule is keyed on recid,
 * the stable identity, not on the malformed report_symbol strings the
 * duplicates happen to carry — the symbol is how they were noticed, not what
 * is wrong with them, and a symbol shape test would also swallow a future
 * non-conforming symbol that is NOT a duplicate, which must render visibly
 * so it gets investigated rather than absorbed. Four literal identities,
 * never a pattern; a fifth duplicate is added here by hand, with its
 * evidence, or not at all. Each entry names its symbol, page(s), and
 * surviving sibling, so deleting an entry shows exactly which row reappears
 * where. The extractor knows nothing of this rule and records nothing about
 * these rows: this file is the only place the exclusion exists.
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

/**
 * Duplicate catalogue records excluded from display (DISPLAY SCOPE, second
 * rule). Per entry: recid — its stored report_symbol / the page(s) it would
 * render on / the clean sibling record that keeps rendering there.
 */
const DISPLAY_EXCLUDED_REPORT_RECIDS = [
  494738, // "***" / A/RES/55/33[E] / sibling 474908 (A/57/124)
  3945711, // "(A/75/918) COLOR PUBLICATION" / A/RES/74/301 / sibling 3931731 (A/75/918)
  3968269, // "(S/2022/272) COLOR" / S/RES/2467 (2019) + S/RES/2467(2019) / sibling 3967573 (S/2022/272)
  4096508, // "(S/2025/389)" / S/RES/2467 (2019) + S/RES/2467(2019) / sibling 4086814 (S/2025/389)
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
      `/* trace:sg-reports.by-mandate */
       SELECT l.report_recid,
              l.report_symbol,
              d.title,
              d.date_publication::text AS date_published,
              bool_and(l.citation_position = 'annex_title') AS annex_position_only
       FROM mandates.sg_report_to_mandate_links l
       JOIN digitallibrary.documents d ON d.recid = l.report_recid
       WHERE $1 = ANY (l.resolution_display_candidates)
         AND l.citation_sense = ANY ($2)
         AND l.report_recid <> ALL ($3)
       GROUP BY l.report_recid, l.report_symbol, d.title, d.date_publication
       ORDER BY d.date_publication DESC NULLS LAST, l.report_symbol`,
      [pageSymbol, DISPLAY_ELIGIBLE_SENSES, DISPLAY_EXCLUDED_REPORT_RECIDS]
    )
  }
)
