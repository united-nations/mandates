'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown, ChevronUp, History, Layers } from 'lucide-react'
import type { ResolutionSeriesInfo } from '@/lib/data/mandates'
import { getMandateUrl } from '@/components/table/MandateColumns'

const MEMBERS_DEFAULT_SHOWN = 8

interface MandateVersionHistoryProps {
  currentSymbol: string
  series: ResolutionSeriesInfo
}

/**
 * Version history / related-resolutions section for a mandate detail view.
 *
 * Vocabulary is driven by the group type (two-tier claim model):
 *  - series (not a collection): "Version history", latest member is labeled,
 *    and a named "superseded by X" banner appears when the gates passed.
 *  - collection: "Related resolutions", members are an unordered group and
 *    are never presented as versions of each other.
 */
export function MandateVersionHistory({
  currentSymbol,
  series,
}: MandateVersionHistoryProps) {
  const [showAll, setShowAll] = useState(false)
  if (series.members.length <= 1) return null

  const span =
    series.first_year && series.last_year && series.first_year !== series.last_year
      ? `${series.first_year}–${series.last_year}`
      : (series.last_year?.toString() ?? '')
  const shown = showAll
    ? series.members
    : series.members.slice(0, MEMBERS_DEFAULT_SHOWN)
  const hiddenCount = series.members.length - shown.length

  return (
    <div>
      <h3 className="flex items-center gap-2 text-base font-semibold">
        {series.is_collection ? (
          <Layers className="h-4 w-4 text-un-blue" />
        ) : (
          <History className="h-4 w-4 text-un-blue" />
        )}
        {series.is_collection ? 'Related resolutions' : 'Version history'}
        <span className="text-sm font-normal text-muted-foreground">
          {series.series_count} resolutions{span ? ` · ${span}` : ''}
        </span>
      </h3>

      {series.superseded_by && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This is an older version — the most recent is{' '}
          <Link
            href={getMandateUrl(series.superseded_by)}
            className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:text-un-blue"
          >
            {series.superseded_by}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
      {!series.superseded_by && series.has_newer && (
        <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          Newer resolutions in this group exist
          {series.last_year ? ` (latest: ${series.last_year})` : ''}.
        </div>
      )}

      <ul className="mt-3 divide-y divide-gray-100 border-y border-gray-100">
        {shown.map((m) => {
          const isCurrent = m.document_symbol === currentSymbol
          return (
            <li
              key={m.document_symbol}
              className={`flex items-center gap-3 py-1.5 text-sm ${
                isCurrent ? 'bg-blue-50/60' : ''
              }`}
            >
              <span className="w-10 shrink-0 text-xs text-muted-foreground">
                {m.year ?? '—'}
              </span>
              {isCurrent ? (
                <span className="w-36 shrink-0 truncate font-mono text-xs font-medium">
                  {m.document_symbol}
                </span>
              ) : (
                <Link
                  href={getMandateUrl(m.document_symbol)}
                  className="w-36 shrink-0 truncate font-mono text-xs font-medium text-un-blue hover:underline"
                >
                  {m.document_symbol}
                </Link>
              )}
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {m.title}
              </span>
              {!series.is_collection && m.is_latest && (
                <span className="ml-auto shrink-0 rounded bg-un-blue px-1.5 py-0.5 text-[10px] font-medium text-white">
                  latest
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-un-blue hover:underline"
        >
          <ChevronDown className="h-3 w-3" />
          Show all {series.members.length}
        </button>
      )}
      {showAll && series.members.length > MEMBERS_DEFAULT_SHOWN && (
        <button
          onClick={() => setShowAll(false)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-un-blue hover:underline"
        >
          <ChevronUp className="h-3 w-3" />
          Show fewer
        </button>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        {series.is_collection
          ? 'Grouped automatically by matching titles within the same organ. This group bundles related resolutions that are not individually ordered.'
          : 'Versions are identified automatically by matching titles within the same organ (~97% accuracy on a manual audit).'}
      </p>
    </div>
  )
}
