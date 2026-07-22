'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, FileOutput } from 'lucide-react'
import Link from 'next/link'
import type { ResolutionReportsLens } from '@/lib/data/reports-lens'
import { FREQUENCY_LABELS } from '@/lib/data/reports-lens'

const REPORTS_DEFAULT_SHOWN = 6

/**
 * "Reporting cycle" section of a mandate detail view: the reporting
 * obligations detected in this resolution's operative paragraphs, and the
 * reports whose "submitted pursuant to …" notes name this resolution.
 * Data comes from the precomputed reports lens (see lib/data/reports-lens.ts);
 * both mandate routes (full page and modal) render this identically.
 */
export function MandateReportsSection({
  lens,
}: {
  lens: ResolutionReportsLens
}) {
  const [showAll, setShowAll] = useState(false)
  const { requests, reports } = lens
  if (requests.length === 0 && reports.length === 0) return null

  const shownReports = showAll
    ? reports
    : reports.slice(0, REPORTS_DEFAULT_SHOWN)
  const hiddenCount = reports.length - shownReports.length

  return (
    <div>
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <FileOutput className="h-4 w-4 text-un-blue" />
        Reporting cycle
        <span className="text-sm font-normal text-muted-foreground">
          {requests.length > 0 &&
            `${requests.length} ${requests.length === 1 ? 'request' : 'requests'}`}
          {requests.length > 0 && reports.length > 0 && ' · '}
          {reports.length > 0 &&
            `${reports.length} ${reports.length === 1 ? 'report' : 'reports'}`}
        </span>
      </h3>

      {requests.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Asks for reports
          </p>
          <ul className="mt-1.5 space-y-2">
            {requests.map((r) => (
              <li key={r.position} className="text-sm">
                <span className="text-xs text-muted-foreground">
                  {r.para ? `¶ ${r.para} — ` : ''}
                  {r.addressee ? (
                    <span className="font-medium text-gray-700">
                      {r.addressee}
                    </span>
                  ) : null}
                  {r.frequency !== 'unspecified' && (
                    <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-un-blue">
                      {FREQUENCY_LABELS[r.frequency]}
                    </span>
                  )}
                </span>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-600 italic">
                  “{r.excerpt}”
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reports.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Reports submitted pursuant to this document
          </p>
          <ul className="mt-1.5 divide-y divide-gray-100 border-y border-gray-100">
            {shownReports.map((rep) => (
              <li
                key={rep.recid}
                className="flex items-center gap-3 py-1.5 text-sm"
              >
                <span className="w-10 shrink-0 text-xs text-muted-foreground">
                  {rep.date ? rep.date.slice(0, 4) : '—'}
                </span>
                <a
                  href={`https://digitallibrary.un.org/record/${rep.recid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-36 shrink-0 items-center gap-1 truncate font-mono text-xs font-medium text-un-blue hover:underline"
                  title="View in the UN Digital Library"
                >
                  <span className="truncate">{rep.symbol}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {rep.title}
                </span>
              </li>
            ))}
          </ul>
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-un-blue hover:underline"
            >
              <ChevronDown className="h-3 w-3" />
              Show all {reports.length}
            </button>
          )}
          {showAll && reports.length > REPORTS_DEFAULT_SHOWN && (
            <button
              onClick={() => setShowAll(false)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-un-blue hover:underline"
            >
              <ChevronUp className="h-3 w-3" />
              Show fewer
            </button>
          )}
        </div>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        Requests are detected automatically in the resolution text; reports are
        linked through their own “submitted pursuant to …” statements in the UN
        Digital Library. Coverage is incomplete — see{' '}
        <Link href="/reports" className="text-un-blue hover:underline">
          the reporting-cycle overview
        </Link>{' '}
        for method and caveats.
      </p>
    </div>
  )
}
