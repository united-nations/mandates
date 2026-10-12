'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DocumentSymbol } from '@/components/DocumentSymbol'
import { cn } from '@/lib/utils'

/**
 * The list of Secretary-General reports on a mandate detail view: one row per
 * report, year · symbol · title, the first few shown and the rest behind
 * "Show all". Shared by the two sources of report links
 * (MandateSgReports, from catalogue notes; MandatePageOneSgReports, from the
 * reports' own first pages) so they read the same; each source keeps its own
 * heading and notes.
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
}

/** The report's UNDL record page — language versions and files are chosen there. */
function undlRecordUrl(recid: number): string {
  return `https://digitallibrary.un.org/record/${recid}`
}

export function SgReportList({ rows }: { rows: SgReportListRow[] }) {
  const [showAll, setShowAll] = useState(false)

  const shown = showAll ? rows : rows.slice(0, DEFAULT_SHOWN)
  const hidden = rows.length - shown.length

  return (
    <>
      <ul className="divide-y divide-gray-100 border-y border-border">
        {shown.map((row) => (
          <li key={row.report_recid} className="min-h-8 py-1 text-sm">
            <div className="flex items-baseline gap-3">
              <span className="w-10 shrink-0 text-sm text-foreground tabular-nums">
                {row.date_published?.slice(0, 4) ?? '—'}
              </span>
              {/* Wraps only for a dual-symbol report, so two chips stack in the
                  column. With one symbol the row lays out as before: a long
                  symbol truncates and keeps the annex chip beside it. */}
              <span
                className={cn(
                  'flex w-36 shrink-0 items-baseline gap-1.5',
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
              <span
                className="min-w-0 flex-1 truncate text-sm text-foreground"
                title={row.title ?? undefined}
              >
                {row.title}
              </span>
            </div>
          </li>
        ))}
      </ul>

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
