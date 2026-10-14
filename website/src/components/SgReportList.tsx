'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DocumentSymbol } from '@/components/DocumentSymbol'
import { Chip } from '@/components/ui/chip'
import { cn } from '@/lib/utils'
import { explainerTexts } from '@/lib/en_text_contents'
import { getMandateUrl } from '@/components/table/MandateColumns'
import { useSearchParams } from 'next/navigation'
import {
  MandateDetailTableColumns,
  mandateDetailTableClassName,
  mandateDetailTableHeaderClassName,
  mandateDetailTableCellClassName,
} from '@/components/MandateDetailTable'

/**
 * The list of Secretary-General reports on a mandate detail view: one row per
 * report, year · symbol · title, the first few shown and the rest behind
 * "Show all". Shared by the report-link blocks (MandateSgReports, from
 * catalogue notes; MandatePageOneSgReports, from the reports' own first
 * pages; MandateUnionSgReports, both) so they read the same; each block keeps
 * its own heading and notes.
 *
 * The row presentation follows the version-history list — year, symbol,
 * title — because both answer "which other document should I open next".
 * Each symbol links to the report's UN Digital Library record page rather
 * than to a file, so the reader chooses a language version there.
 */

const DEFAULT_SHOWN = 5

export interface SgReportListRow {
  report_recid: number
  /**
   * The report's symbols, each shown as its own chip in this order: one for
   * most reports, two for a report issued to two organs. Every chip links to
   * the same record page, which carries all of them.
   */
  symbols: string[]
  title: string | null
  date_published: string | null
  /** Rendered after the symbol, inside its column (the annex chip). */
  marker?: ReactNode
  /**
   * A quiet second line under the title (the union block's provenance).
   * Without one the row is a single line, as before.
   */
  note?: ReactNode
  /** One column containing every specifically linked mandate version. */
  resolutions?: ReactNode
}

/** The report's UNDL record page — language versions and files are chosen there. */
function undlRecordUrl(recid: number): string {
  return `https://digitallibrary.un.org/record/${recid}`
}

export function SgReportList({ rows }: { rows: SgReportListRow[] }) {
  const [showAll, setShowAll] = useState(false)

  const shown = showAll ? rows : rows.slice(0, DEFAULT_SHOWN)
  const hidden = rows.length - shown.length
  const showResolutions = rows.some((row) => row.resolutions !== undefined)

  return (
    <>
      <div className="overflow-x-auto">
        <table className={mandateDetailTableClassName}>
          <MandateDetailTableColumns />
          <thead className={mandateDetailTableHeaderClassName}>
            <tr className="border-b border-border">
              <th scope="col" className="py-1 pr-3 align-top font-medium">
                {explainerTexts.mandateDetail.sgReports.year}
              </th>
              <th scope="col" className="py-1 pr-3 align-top font-medium">
                {explainerTexts.mandateDetail.sgReports.symbol}
              </th>
              <th
                scope="col"
                colSpan={showResolutions ? 2 : 3}
                className="py-1 pr-3 align-top font-medium"
              >
                {explainerTexts.mandateDetail.sgReports.title}
              </th>
              {showResolutions && (
                <th
                  scope="col"
                  className="py-1 text-right align-top font-medium"
                >
                  {explainerTexts.mandateDetail.sgReports.resolution}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shown.map((row) => (
              <tr key={row.report_recid} className="h-8 text-sm">
                <td
                  className={`${mandateDetailTableCellClassName} tabular-nums`}
                >
                  {row.date_published?.slice(0, 4) ?? '—'}
                </td>
                {/* Wraps only for a dual-symbol report, so two chips stack in the
                  column. With one symbol the row lays out as before: a long
                  symbol truncates and keeps the annex chip beside it. */}
                <td className={mandateDetailTableCellClassName}>
                  <span
                    className={cn(
                      'flex min-w-0 items-baseline gap-1.5',
                      row.symbols.length > 1 && 'flex-wrap'
                    )}
                  >
                    {row.symbols.map((symbol) => (
                      <a
                        key={symbol}
                        href={undlRecordUrl(row.report_recid)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Open ${symbol} in the UN Digital Library`}
                        className="inline-flex min-w-0 items-baseline rounded hover:underline focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none"
                      >
                        <DocumentSymbol className="inline-flex max-w-full min-w-0 items-baseline">
                          <span className="min-w-0 truncate">{symbol}</span>
                        </DocumentSymbol>
                      </a>
                    ))}
                    {row.marker}
                  </span>
                </td>
                <td
                  colSpan={showResolutions ? 2 : 3}
                  className={mandateDetailTableCellClassName}
                >
                  {row.note ? (
                    <span className="block min-w-0">
                      <span
                        className="block truncate text-sm text-foreground"
                        title={row.title ?? undefined}
                      >
                        {row.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {row.note}
                      </span>
                    </span>
                  ) : (
                    <span
                      className="block min-w-0 truncate text-sm text-foreground"
                      title={row.title ?? undefined}
                    >
                      {row.title}
                    </span>
                  )}
                </td>
                {showResolutions && (
                  <td className="py-1 text-right align-baseline">
                    <span className="flex min-w-0 flex-wrap items-baseline justify-end gap-1.5">
                      {row.resolutions ?? '—'}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="inline-flex items-center gap-1 text-sm font-medium text-un-blue-text hover:underline"
        >
          <ChevronDown className="h-3 w-3" />
          Show all {rows.length}
        </button>
      )}
      {showAll && rows.length > DEFAULT_SHOWN && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="inline-flex items-center gap-1 text-sm font-medium text-un-blue-text hover:underline"
        >
          <ChevronUp className="h-3 w-3" />
          Show fewer
        </button>
      )}
    </>
  )
}

/** Secondary identifiers link to their exact mandate version. */
export function SgReportResolutionSymbol({
  symbol,
  title,
}: {
  symbol: string
  title?: string
}) {
  const searchParams = useSearchParams()
  return (
    <DocumentSymbol
      href={getMandateUrl(symbol, undefined, searchParams)}
      title={title}
      className="border-border bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
    >
      {symbol}
    </DocumentSymbol>
  )
}

/**
 * The "annex" chip on a row the catalogue notes mark as annex-only: an annex
 * to the report, rather than the report itself, was submitted under the
 * resolution. Its tooltip is the caller's, since the blocks word it
 * differently.
 */
export function SgReportAnnexChip({ title }: { title: string }) {
  return (
    <Chip
      tone="ghost"
      density="dense"
      title={title}
      className="shrink-0 cursor-help self-center"
    >
      annex
    </Chip>
  )
}
