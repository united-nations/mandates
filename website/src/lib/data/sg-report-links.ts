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
 * Symbols match the precomputed registry display candidates byte-exactly.
 * Family reads also match stored resolution_canonical to the catalogue's
 * symbol_normalized identity, which the extractor uses. This includes genuine
 * historical members with no registry candidates and retains symbol aliases
 * without inventing a resolution identity from prose at read time.
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
 * these rows: this file is the only place the website applies the exclusion.
 *
 * MIRRORED IN THE DATABASE
 * ------------------------
 * The view mandates.sg_report_page_one_vs_stage1_keys
 * (sql/migrations/043_sg_report_page_one_links.sql) copies both rules above,
 * and the single-page candidates match, so that its comparison of
 * Stage 1 with page-one links sees what this page shows. A change to
 * DISPLAY_ELIGIBLE_SENSES, DISPLAY_EXCLUDED_REPORT_RECIDS or the candidates
 * match here must be made in that view too. Family expansion is outside that
 * per-page diagnostic scope; calls without family targets retain its match.
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
  /** Exact family member symbols matched by this source's stored candidates. */
  resolution_symbols?: string[]
  /** Family members linked only through an annex, rather than the report. */
  annex_resolution_symbols?: string[]
}

/** Stored catalogue identity plus the exact symbol to show in this family. */
export interface SgReportResolutionTarget {
  symbol: string
  canonical: string | null
}

/**
 * Secretary-General reports mandated by the requested resolution family
 * (or just `pageSymbol` when called without a family), newest first. One
 * entry per report; empty array when the resolution has none in display
 * scope. Report title and date come from digitallibrary.documents via
 * report_recid — the same join getResolutionSeries uses.
 */
export async function getCatalogueReportsMany(
  targets: { page_symbol: string; symbol: string; canonical: string | null }[]
): Promise<Map<string, MandatedSgReport[]>> {
    const reports = await queryMany<MandatedSgReport & { page_symbol: string }>(
      `/* trace:sg-reports.by-mandate */
       WITH matched_links AS (
         SELECT matched.page_symbol, l.report_recid, l.report_symbol, matched.symbol,
                bool_and(l.citation_position = 'annex_title') AS annex_only
         FROM mandates.sg_report_to_mandate_links l
         JOIN jsonb_to_recordset($1::jsonb) matched(page_symbol text, symbol text, canonical text)
           ON matched.symbol = ANY (l.resolution_display_candidates)
           OR matched.canonical = l.resolution_canonical
         WHERE l.citation_sense = ANY ($2)
           AND l.report_recid <> ALL ($3)
         GROUP BY matched.page_symbol, l.report_recid, l.report_symbol, matched.symbol
       )
       SELECT l.page_symbol, l.report_recid,
              l.report_symbol,
              d.title,
              d.date_publication::text AS date_published,
              bool_and(l.annex_only) AS annex_position_only,
              array_agg(DISTINCT l.symbol ORDER BY l.symbol) AS resolution_symbols,
              COALESCE(array_agg(DISTINCT l.symbol ORDER BY l.symbol)
                FILTER (WHERE l.annex_only), ARRAY[]::text[]) AS annex_resolution_symbols
       FROM matched_links l
       JOIN digitallibrary.documents d ON d.recid = l.report_recid
       GROUP BY l.page_symbol, l.report_recid, l.report_symbol, d.title, d.date_publication
       ORDER BY d.date_publication DESC NULLS LAST, l.report_symbol`,
      [JSON.stringify(targets), DISPLAY_ELIGIBLE_SENSES, DISPLAY_EXCLUDED_REPORT_RECIDS]
    )
    for (const report of reports) {
      if (!report.resolution_symbols?.length ||
          !Array.isArray(report.annex_resolution_symbols)) {
        throw new Error(`SG report ${report.report_recid}: missing resolution linkage data`)
      }
    }
    return new Map([...new Set(targets.map(target => target.page_symbol))].map(symbol => [symbol,
      reports.filter(report => report.page_symbol === symbol).map(row => { const report = { ...row }; Reflect.deleteProperty(report, 'page_symbol'); return report })
    ]))
}
export const getSgReportsMandatedByResolution = cache(async (
  pageSymbol: string,
  familyTargets: SgReportResolutionTarget[] = [{ symbol: pageSymbol, canonical: null }]
): Promise<MandatedSgReport[]> => (await getCatalogueReportsMany(familyTargets.map(target => ({ ...target, page_symbol: pageSymbol })))).get(pageSymbol) ?? [])
