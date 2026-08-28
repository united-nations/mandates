/**
 * Display logic for the mandated-SG-reports block: the observed year span,
 * the summary-tile visibility thresholds, the cadence classifier, and the
 * annex note that qualifies the list.
 *
 * Pure functions over the row values (`MandatedSgReport.date_published` /
 * `annex_position_only`), kept out of the component so the rules are testable
 * without rendering. Nothing here reaches the data layer.
 *
 * `date_published` is nullable and the read sorts it NULLS LAST. A missing
 * date produces a missing claim, never a substituted one: undated rows are
 * excluded from the span and the cadence computation, and when no row carries
 * a date the span is null and the classifier returns null — the heading
 * drops its span, and the tiles that would state a date-derived fact do not
 * render.
 *
 * The tile rules below are dormant while
 * SUMMARISE_SG_REPORTS_AS_TILES_ON_DETAIL_PAGE is off. They are kept, not
 * deleted, for the reason that constant gives.
 */

/**
 * Whether the reports block states its figures as tiles above the list, as
 * well as beside the heading. The tiles are one unit — the Reports,
 * Span and Cadence tiles, and the threshold tests that decide which of them
 * has a finding to state — and they are gated together because they are one
 * rendering of the block. Gated separately they would produce a row of one
 * tile stating a figure the sentence directly above it already states, which
 * is not a design anyone chose.
 *
 * Off. The count and the span now sit beside the heading, in the slot every
 * sibling section uses, so a Reports or Span tile restates a figure printed
 * a line above it. The tiles have only figures to show, and the heading
 * already carries every figure they carry, in less space.
 *
 * Nothing is lost while it is off. The heading states the count and the
 * year span, the annex note states the annex qualification, and the row list
 * carries every per-report fact the tiles summarised.
 *
 * WHAT TURNS IT BACK ON: the SG report text enrichment landing, which would
 * give the tiles something to say that the sentence and the list do not
 * already say. WHEN THE BRANCH GOES: if that has not happened by the close
 * of this arc of work, delete this constant, the SgReportSummaryTiles
 * component, and the tile thresholds and cadence classifier below together
 * with their tests — the tiles are the only consumer of any of them. The
 * span helper stays either way; the heading's span comes from it.
 */
export const SUMMARISE_SG_REPORTS_AS_TILES_ON_DETAIL_PAGE: boolean = false

/**
 * The Reports tile renders only at this count or above. Measured over the
 * live corpus, 95.6% of visible pages carry four reports or fewer, and the
 * heading already states the count beside the question — so a count below
 * this is not a finding worth a tile.
 */
export const REPORTS_TILE_MIN_COUNT = 5

/**
 * The Span tile renders only at this many observed years or above. Measured
 * over the live corpus, 85.8% of visible pages span a single year; below this
 * the span is already fully carried by the heading.
 */
export const SPAN_TILE_MIN_YEARS = 5

/**
 * Below this many observations a rhythm label would be fit to noise: 95.6% of
 * visible pages carry four reports or fewer, and none of those support a
 * cadence claim.
 */
const CADENCE_MIN_REPORTS = 5

/**
 * A rhythm claim needs at least this many periods — annual: five populated
 * years; biennial: five active years (four two-year intervals).
 */
const CADENCE_MIN_PERIODS = 5

/**
 * Publication years of the dated rows, one entry per dated row. Undated rows
 * contribute nothing — the shared first step of every date-derived claim
 * here.
 */
function datedYears(dates: (string | null)[]): number[] {
  return dates
    .filter((d): d is string => d !== null)
    .map((d) => Number(d.slice(0, 4)))
}

/** The years the dated rows cover, as the heading states them. */
export interface ObservedYearSpan {
  /** "2015" for a single year, "2006–2026" otherwise. */
  label: string
  /** Inclusive calendar-year count: 2006–2026 is 21 years. */
  years: number
}

/**
 * The span of publication years across the dated rows. Undated rows carry no
 * year and contribute nothing; null when no row is dated, so the caller drops
 * the year claim rather than rendering a defaulted one.
 */
export function observedYearSpan(
  dates: (string | null)[]
): ObservedYearSpan | null {
  const years = datedYears(dates)
  if (years.length === 0) return null
  const first = Math.min(...years)
  const last = Math.max(...years)
  return {
    label: first === last ? String(first) : `${first}–${last}`,
    years: last - first + 1,
  }
}

/** A cadence finding, as the Cadence tile displays it. */
export interface ReportCadence {
  /** The tile's value line: "Annual", "Biennial", "≈2 / year". */
  value: string
  /** The tile's sub-line: "one report each year", "across 6 years". */
  sub: string
}

/**
 * Classifies the publication rhythm of a report series from its
 * `date_published` values, or returns null — the explicit no-claim outcome,
 * and by far the most common one (the tile fires on ~1.3% of visible pages).
 *
 * The regularity tests are exact, so a series with a silently dropped
 * interior year FAILS rather than passes: "Annual" and "≈k / year" require
 * every year in the observed span populated, and "Biennial" requires every
 * consecutive-year gap to be exactly 2. The failure mode is an absent tile,
 * never a hedged label.
 *
 * Blind spots, both directions: a series whose early years are uncatalogued
 * reads as a shorter clean run (the span beside the heading bounds the claim
 * to the observed window), and a year that genuinely had two reports
 * with one missing from the catalogue can CREATE an "Annual" reading rather
 * than break one — the rule detects dropped years, not dropped reports
 * within a year.
 */
export function classifyReportCadence(
  dates: (string | null)[]
): ReportCadence | null {
  const years = datedYears(dates)
  if (years.length === 0) return null

  const distinct = [...new Set(years)].sort((a, b) => a - b)
  const reportCount = years.length
  const distinctYears = distinct.length
  const spanYears = distinct[distinctYears - 1] - distinct[0] + 1

  if (reportCount < CADENCE_MIN_REPORTS) return null

  // Every year in the span is populated: annual or a steady multiple.
  if (distinctYears === spanYears) {
    if (reportCount === spanYears && spanYears >= CADENCE_MIN_PERIODS) {
      return { value: 'Annual', sub: 'one report each year' }
    }
    const perYear = reportCount / spanYears
    if (perYear >= 2 && spanYears >= CADENCE_MIN_PERIODS) {
      return {
        value: `≈${Math.round(perYear)} / year`,
        sub: `across ${spanYears} years`,
      }
    }
    return null
  }

  // One report in every second year, exactly.
  const gaps = distinct.slice(1).map((year, i) => year - distinct[i])
  if (
    distinctYears >= CADENCE_MIN_PERIODS &&
    reportCount === distinctYears &&
    gaps.every((gap) => gap === 2)
  ) {
    return { value: 'Biennial', sub: 'one report every second year' }
  }
  return null
}

/**
 * The annex qualification as its own sentence, or null when no row carries
 * one and there is nothing to say.
 *
 * This is the block's only always-visible statement that a report answered
 * the resolution through an annex. The per-row marker abbreviates the same
 * fact to "annex" and keeps the explanation in a title attribute, which is
 * mouse-only and sits on a span nothing can focus, so it does not carry the
 * disclosure by itself.
 *
 * Each case is a complete sentence. It used to be a fragment starting at its
 * terminal punctuation, because it closed a summary sentence that stated the
 * count and the span in front of it; the heading states both now, so the
 * fragment has nothing to attach to and supplies its own subject.
 *
 * - one report which is annex-mediated — names that report.
 * - all of several — "All of these reports …", on every row.
 * - some of several — "{count} of these reports …", on a subset.
 *
 * `annexCount` is the number of rows with `annex_position_only`; it can
 * never exceed `reportCount`.
 */
export function annexPositionNote(
  annexCount: number,
  reportCount: number
): string | null {
  if (annexCount === 0) return null
  if (reportCount === 1) {
    return 'This report was submitted as an annex rather than the report itself.'
  }
  if (annexCount === reportCount) {
    return 'All of these reports were submitted via an annex rather than the report itself.'
  }
  return `${annexCount} of these reports were submitted via an annex rather than the report itself.`
}
