'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  DetailDisclaimer,
  DetailSectionHeading,
} from '@/components/MandateDetailUi'
import { Chip } from '@/components/ui/chip'
import type { MandatedSgReport } from '@/lib/data/sg-report-links'
import {
  annexPositionClause,
  classifyReportCadence,
  observedYearSpan,
  REPORTS_TILE_MIN_COUNT,
  SPAN_TILE_MIN_YEARS,
} from '@/lib/sg-report-summary'

/**
 * Secretary-General reports submitted under the mandate on view — the reports
 * whose Digital Library catalogue record names this resolution as the one
 * they were submitted pursuant to.
 *
 * The block reads heading → summary sentence → tiles → list → footnote, and
 * the sparse rendering is the normal one: the sentence always renders, but
 * each tile renders only when its number is itself a finding (the sentence
 * already states count and span in prose), so on ~94% of visible pages no
 * tile qualifies and the tiles row is omitted entirely — that state is
 * deliberate, not degraded.
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
 * ghost chip and of the Reports tile's "via annex" sub-line; the summary
 * sentence carries the same fact in prose.
 */
const ANNEX_POSITION_NOTE =
  'An annex to this report, rather than the report itself, was submitted pursuant to this resolution.'

export function MandateSgReports({ reports }: { reports: MandatedSgReport[] }) {
  const [showAll, setShowAll] = useState(false)
  if (reports.length === 0) return null

  const n = reports.length
  const dates = reports.map((r) => r.date_published)
  const span = observedYearSpan(dates)
  const cadence = classifyReportCadence(dates)
  const annexCount = reports.filter((r) => r.annex_position_only).length

  const showReportsTile = n >= REPORTS_TILE_MIN_COUNT
  const spanTile =
    span !== null && span.years >= SPAN_TILE_MIN_YEARS ? span : null

  const shown = showAll ? reports : reports.slice(0, DEFAULT_SHOWN)
  const hidden = reports.length - shown.length

  return (
    <section className="space-y-3">
      <DetailSectionHeading>
        Which reports were submitted under this mandate?
      </DetailSectionHeading>

      <p className="max-w-[44rem] text-sm text-gray-700">
        <strong>
          {n} report{n === 1 ? '' : 's'} of the Secretary-General
        </strong>{' '}
        submitted under this mandate
        {span ? `, ${span.label}` : ''}
        {annexPositionClause(annexCount, n)}
      </p>

      {(showReportsTile || spanTile || cadence) && (
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
            <SummaryTile
              label="Cadence"
              value={cadence.value}
              sub={cadence.sub}
            />
          )}
        </div>
      )}

      <ul className="divide-y divide-gray-100 border-y border-gray-100">
        {shown.map((report) => (
          <li key={report.report_recid} className="py-1.5 text-sm">
            <div className="flex items-baseline gap-3">
              <span className="w-10 shrink-0 text-xs text-gray-500">
                {report.date_published?.slice(0, 4) ?? '—'}
              </span>
              <span className="flex w-36 shrink-0 items-baseline gap-1.5">
                <a
                  href={undlRecordUrl(report.report_recid)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Open ${report.report_symbol} in the UN Digital Library`}
                  className="min-w-0 truncate font-mono text-xs font-medium text-un-blue hover:underline"
                >
                  {report.report_symbol}
                </a>
                {report.annex_position_only && (
                  // Size overrides against chip.tsx's no-hand-written-classes
                  // rule, deliberately: the dense density's 12px text and
                  // padding would make annex rows taller than their
                  // neighbours, and this list depends on a uniform
                  // single-line row rhythm. One call site does not justify a
                  // fourth density on the primitive; if a second sub-row-size
                  // chip appears, promote these sizes to a density there.
                  <Chip
                    tone="ghost"
                    density="dense"
                    title={ANNEX_POSITION_NOTE}
                    className="shrink-0 cursor-help self-center px-1.5 py-[2px] text-[10px] leading-none"
                  >
                    annex
                  </Chip>
                )}
              </span>
              <span
                className="min-w-0 flex-1 truncate text-xs text-gray-600"
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
          className="inline-flex items-center gap-1 text-xs font-medium text-un-blue hover:underline"
        >
          <ChevronDown className="h-3 w-3" />
          Show all {reports.length}
        </button>
      )}
      {showAll && reports.length > DEFAULT_SHOWN && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="inline-flex items-center gap-1 text-xs font-medium text-un-blue hover:underline"
        >
          <ChevronUp className="h-3 w-3" />
          Show fewer
        </button>
      )}

      <DetailDisclaimer>
        Identified automatically from the metadata in each report&rsquo;s UN
        Digital Library catalogue record.
      </DetailDisclaimer>
    </section>
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
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="mt-0.5 text-[1.375rem] leading-tight font-semibold text-gray-900">
        {value}
      </div>
      {sub && (
        <div className="mt-0.5 text-[11px] text-gray-500" title={subTitle}>
          {sub}
        </div>
      )}
    </div>
  )
}
