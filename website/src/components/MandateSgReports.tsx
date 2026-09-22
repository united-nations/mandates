'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DetailSectionHeading } from '@/components/MandateDetailUi'
import { DocumentSymbol } from '@/components/DocumentSymbol'
import { Chip } from '@/components/ui/chip'
import { explainerTexts } from '@/lib/en_text_contents'
import type { MandatedSgReport } from '@/lib/data/sg-report-links'
import {
  annexPositionNote,
  classifyReportCadence,
  observedYearSpan,
  REPORTS_TILE_MIN_COUNT,
  SPAN_TILE_MIN_YEARS,
  SUMMARISE_SG_REPORTS_AS_TILES_ON_DETAIL_PAGE,
} from '@/lib/sg-report-summary'

/**
 * Secretary-General reports submitted under the mandate on view — the reports
 * whose Digital Library catalogue record names this resolution as the one
 * they were submitted pursuant to.
 *
 * The block reads heading → list → footnote. The heading carries the count
 * and the observed year span in its hint slot, the way every sibling section
 * states its own count, so nothing between it and the list restates them.
 * The one line that can sit in between is the annex note, and it renders
 * only when some row was submitted through an annex.
 *
 * The tiles that used to sit there are behind
 * SUMMARISE_SG_REPORTS_AS_TILES_ON_DETAIL_PAGE, which is off; that constant
 * carries the reasoning and the condition for bringing them back.
 *
 * The row presentation follows the version-history list — year, symbol,
 * title — because both answer "which other document should I open next".
 * Each symbol links to the report's UN Digital Library record page rather
 * than to a file, so the reader chooses a language version there.
 */

const DEFAULT_SHOWN = 5

/** The report's UNDL record page — language versions and files are chosen there. */
function undlRecordUrl(recid: number): string {
  return `https://digitallibrary.un.org/record/${recid}`
}

/**
 * Annex-position entries assert a different relationship — the annex, not the
 * report itself, answers the resolution. Shown as the tooltip of the row's
 * ghost chip and, while the tiles are on, of the Reports tile's "via annex"
 * sub-line. Neither is the disclosure: a title attribute is mouse-only and
 * this span cannot be focused, so the annex note above the list is what
 * actually states the fact on the page.
 */
const ANNEX_POSITION_NOTE =
  'An annex to this report, rather than the report itself, was submitted pursuant to this resolution.'

export function MandateSgReports({ reports }: { reports: MandatedSgReport[] }) {
  const [showAll, setShowAll] = useState(false)
  if (reports.length === 0) return null

  const n = reports.length
  const span = observedYearSpan(reports.map((r) => r.date_published))
  const annexCount = reports.filter((r) => r.annex_position_only).length
  const annexNote = annexPositionNote(annexCount, n)

  const shown = showAll ? reports : reports.slice(0, DEFAULT_SHOWN)
  const hidden = reports.length - shown.length

  return (
    <section className="space-y-3">
      <DetailSectionHeading
        hint={`${n} report${n === 1 ? '' : 's'}${span ? ` · ${span.label}` : ''}`}
        disclaimer={explainerTexts.mandateDetail.sgReports.disclaimer}
      >
        Which reports were submitted under this mandate?
      </DetailSectionHeading>

      {annexNote && (
        <p className="max-w-[44rem] text-sm text-gray-700">{annexNote}</p>
      )}

      {SUMMARISE_SG_REPORTS_AS_TILES_ON_DETAIL_PAGE && (
        <SgReportSummaryTiles reports={reports} />
      )}

      <ul className="divide-y divide-gray-100 border-y border-gray-100">
        {shown.map((report) => (
          <li key={report.report_recid} className="min-h-8 py-1 text-sm">
            <div className="flex items-baseline gap-3">
              <span className="w-10 shrink-0 text-sm text-black tabular-nums">
                {report.date_published?.slice(0, 4) ?? '—'}
              </span>
              <span className="flex w-36 shrink-0 items-baseline gap-1.5">
                <a
                  href={undlRecordUrl(report.report_recid)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Open ${report.report_symbol} in the UN Digital Library`}
                  className="inline-flex min-w-0 items-baseline rounded hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-un-blue"
                >
                  <DocumentSymbol className="inline-flex min-w-0 max-w-full items-baseline text-sm">
                    <span className="min-w-0 truncate">{report.report_symbol}</span>
                  </DocumentSymbol>
                </a>
                {report.annex_position_only && (
                  <Chip
                    tone="ghost"
                    density="dense"
                    title={ANNEX_POSITION_NOTE}
                    className="shrink-0 cursor-help self-center"
                  >
                    annex
                  </Chip>
                )}
              </span>
              <span
                className="min-w-0 flex-1 truncate text-sm text-gray-700"
                title={report.title ?? undefined}
              >
                {report.title}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="inline-flex items-center gap-1 text-sm font-medium text-un-blue hover:underline"
        >
          <ChevronDown className="h-3 w-3" />
          Show all {reports.length}
        </button>
      )}
      {showAll && reports.length > DEFAULT_SHOWN && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="inline-flex items-center gap-1 text-sm font-medium text-un-blue hover:underline"
        >
          <ChevronUp className="h-3 w-3" />
          Show fewer
        </button>
      )}
    </section>
  )
}

/**
 * The summary row: the count, the year span and the publication cadence
 * stated as figures above the list. Every expression of the tiles lives in
 * here — the threshold tests, the cadence classification and the tiles
 * themselves — so SUMMARISE_SG_REPORTS_AS_TILES_ON_DETAIL_PAGE has exactly
 * one call site to gate and the row cannot half-render.
 *
 * Returns null when no figure clears its threshold, which is the ordinary
 * outcome rather than a degraded one: the heading already states the count
 * and the span, so a tile earns its place only where its number is itself a
 * finding, and on ~94% of visible pages none is.
 */
function SgReportSummaryTiles({ reports }: { reports: MandatedSgReport[] }) {
  const n = reports.length
  const dates = reports.map((r) => r.date_published)
  const span = observedYearSpan(dates)
  const cadence = classifyReportCadence(dates)
  const annexCount = reports.filter((r) => r.annex_position_only).length

  const showReportsTile = n >= REPORTS_TILE_MIN_COUNT
  const spanTile =
    span !== null && span.years >= SPAN_TILE_MIN_YEARS ? span : null

  if (!showReportsTile && !spanTile && !cadence) return null

  return (
    <div className="flex flex-wrap gap-3">
      {showReportsTile && (
        <SummaryTile
          label="Reports"
          value={String(n)}
          sub={annexCount > 0 ? `${annexCount} via annex` : undefined}
          subTitle={ANNEX_POSITION_NOTE}
        />
      )}
      {spanTile && (
        <SummaryTile
          label="Span"
          value={spanTile.label}
          sub={`${spanTile.years} years`}
        />
      )}
      {cadence && (
        <SummaryTile label="Cadence" value={cadence.value} sub={cadence.sub} />
      )}
    </div>
  )
}

/**
 * One tile of the summary row. Tiles carry no flex-grow, so a tile alone
 * keeps its natural width rather than stretching to fill the row, and the
 * wrapper sets no align-items, so flex's default stretch keeps the tiles in
 * a row the same height. Both are load-bearing.
 */
function SummaryTile({
  label,
  value,
  sub,
  subTitle,
}: {
  label: string
  value: string
  sub?: string
  subTitle?: string
}) {
  return (
    <div className="min-w-38 rounded-lg border border-gray-200 px-3.5 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[1.375rem] leading-tight font-semibold text-gray-900">
        {value}
      </div>
      {sub && (
        <div className="mt-0.5 text-xs text-muted-foreground" title={subTitle}>
          {sub}
        </div>
      )}
    </div>
  )
}
