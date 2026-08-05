'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  DetailFootnote,
  DetailSectionHeading,
} from '@/components/MandateDetailUi'
import type { MandatedSgReport } from '@/lib/data/sg-report-links'

/**
 * Secretary-General reports submitted under the mandate on view — the reports
 * whose Digital Library catalogue record names this resolution as the one
 * they were submitted pursuant to.
 *
 * Presentation follows the version-history list — year, symbol, title —
 * because both answer "which other document should I open next". Each symbol
 * links to the report's UN Digital Library record page rather than to a file,
 * so the reader chooses a language version there.
 */

const DEFAULT_SHOWN = 5

/** The report's UNDL record page — language versions and files are chosen there. */
function undlRecordUrl(recid: number): string {
  return `https://digitallibrary.un.org/record/${recid}`
}

/**
 * Annex-position entries assert a different relationship — the annex, not the
 * report itself, answers the resolution — so they carry this note instead of
 * rendering identically.
 */
const ANNEX_POSITION_NOTE =
  'An annex to this report, rather than the report itself, was submitted pursuant to this resolution.'

export function MandateSgReports({ reports }: { reports: MandatedSgReport[] }) {
  const [showAll, setShowAll] = useState(false)
  if (reports.length === 0) return null

  const shown = showAll ? reports : reports.slice(0, DEFAULT_SHOWN)
  const hidden = reports.length - shown.length

  return (
    <section className="space-y-3">
      <DetailSectionHeading
        hint={`${reports.length} ${reports.length === 1 ? 'report' : 'reports'}`}
      >
        Which reports were submitted under this mandate?
      </DetailSectionHeading>

      <ul className="divide-y divide-gray-100 border-y border-gray-100">
        {shown.map((report) => (
          <li key={report.report_recid} className="py-1.5 text-sm">
            <div className="flex items-baseline gap-3">
              <span className="w-10 shrink-0 text-xs text-gray-500">
                {report.date_published?.slice(0, 4) ?? '—'}
              </span>
              <a
                href={undlRecordUrl(report.report_recid)}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open ${report.report_symbol} in the UN Digital Library`}
                className="w-36 shrink-0 truncate font-mono text-xs font-medium text-un-blue hover:underline"
              >
                {report.report_symbol}
              </a>
              <span
                className="min-w-0 flex-1 truncate text-xs text-gray-600"
                title={report.title ?? undefined}
              >
                {report.title}
              </span>
            </div>
            {report.annex_position_only && (
              <div className="mt-0.5 pl-[3.25rem] text-[11px] text-gray-500">
                {ANNEX_POSITION_NOTE}
              </div>
            )}
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

      <DetailFootnote>
        Identified automatically from each report&rsquo;s UN Digital Library
        catalogue record (&ldquo;submitted pursuant to&hellip;&rdquo;). Symbols
        open the report&rsquo;s Digital Library page, where its language
        versions are available.
      </DetailFootnote>
    </section>
  )
}
