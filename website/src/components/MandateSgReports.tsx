'use client'

import { DetailSectionHeading } from '@/components/MandateDetailUi'
import { SgReportList } from '@/components/SgReportList'
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
 * The rows are SgReportList's, shared with the page-one block; this
 * component adds the annex chip to a row through its marker.
 */

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
  if (reports.length === 0) return null

  const n = reports.length
  const span = observedYearSpan(reports.map((r) => r.date_published))
  const annexCount = reports.filter((r) => r.annex_position_only).length
  const annexNote = annexPositionNote(annexCount, n)

  return (
    <section className="space-y-3">
      <DetailSectionHeading
        hint={`${n} report${n === 1 ? '' : 's'}${span ? ` · ${span.label}` : ''}`}
        disclaimer={explainerTexts.mandateDetail.sgReports.disclaimer}
      >
        Which reports were submitted under this mandate?
      </DetailSectionHeading>

      {annexNote && (
        <p className="max-w-[44rem] text-sm text-foreground">{annexNote}</p>
      )}

      {SUMMARISE_SG_REPORTS_AS_TILES_ON_DETAIL_PAGE && (
        <SgReportSummaryTiles reports={reports} />
      )}

      <SgReportList
        rows={reports.map((report) => ({
          report_recid: report.report_recid,
          symbol: report.report_symbol,
          title: report.title,
          date_published: report.date_published,
          marker: report.annex_position_only && (
            <Chip
              tone="ghost"
              density="dense"
              title={ANNEX_POSITION_NOTE}
              className="shrink-0 cursor-help self-center"
            >
              annex
            </Chip>
          ),
        }))}
      />
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
    <div className="min-w-38 rounded-lg border border-border px-3.5 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[1.375rem] leading-tight font-semibold text-foreground">
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
