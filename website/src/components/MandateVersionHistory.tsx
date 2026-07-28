'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown, ChevronUp, GitCompare } from 'lucide-react'
import type { ResolutionSeriesInfo } from '@/lib/data/mandates'
import { DocumentSymbol } from '@/components/DocumentSymbol'
import { getMandateUrl } from '@/components/table/MandateColumns'
import {
  DetailFootnote,
  DetailSectionHeading,
} from '@/components/MandateDetailUi'

const MEMBERS_DEFAULT_SHOWN = 5

/** The standalone diff viewer; no /diff route exists in this app. */
const DIFF_VIEWER = 'https://diff.un-two-zero.dev/'

interface MandateVersionHistoryProps {
  currentSymbol: string
  series: ResolutionSeriesInfo
}

/**
 * Version history / related-resolutions section for a mandate detail view.
 *
 * Vocabulary is driven by the group type (two-tier claim model):
 *  - series (not a collection): "Version history", the latest member is
 *    labelled, and a named banner appears when the gates passed.
 *  - collection: "Related resolutions", members are an unordered group and are
 *    never presented as versions of each other.
 *
 * The word "superseded" is deliberately absent from every string here. The DB
 * column is still called `superseded_by`, but the claim we are entitled to make
 * to a reader is only "this is not the latest version" — nothing about legal
 * effect.
 *
 * The heading is phrased as a question ("How has this mandate changed?") like
 * its three siblings, and not as the noun label "Version history": this section
 * sits *between* two of the questions, and a noun label at question weight read
 * as a sub-heading of the question above it. The count and the year span move
 * into the heading hint, so nothing is lost.
 */
export function MandateVersionHistory({
  currentSymbol,
  series,
}: MandateVersionHistoryProps) {
  const [showAll, setShowAll] = useState(false)
  if (series.members.length <= 1) return null

  const span =
    series.first_year &&
    series.last_year &&
    series.first_year !== series.last_year
      ? `${series.first_year}–${series.last_year}`
      : (series.last_year?.toString() ?? '')

  // Members arrive newest first, so the default slice is the 5 most recent.
  const shown = showAll
    ? series.members
    : series.members.slice(0, MEMBERS_DEFAULT_SHOWN)
  const hiddenCount = series.members.length - shown.length

  return (
    <section className="space-y-3">
      <DetailSectionHeading
        hint={`${series.series_count} resolutions${span ? ` · ${span}` : ''}`}
      >
        {series.is_collection
          ? 'What else is in this group?'
          : 'How has this mandate changed?'}
      </DetailSectionHeading>

      {series.superseded_by && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
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
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          Newer resolutions in this group exist
          {series.last_year ? ` (latest: ${series.last_year})` : ''}.
        </div>
      )}

      <ul className="divide-y divide-gray-100 border-y border-gray-100">
        {shown.map((m) => {
          const isCurrent = m.document_symbol === currentSymbol
          return (
            <li
              key={m.document_symbol}
              className={`flex items-center gap-3 py-1.5 text-sm ${
                isCurrent ? 'bg-blue-50/60' : ''
              }`}
            >
              <span className="w-10 shrink-0 text-xs text-gray-500">
                {m.year ?? '—'}
              </span>
              {isCurrent ? (
                <DocumentSymbol subdued className="w-36 shrink-0 truncate">
                  {m.document_symbol}
                </DocumentSymbol>
              ) : (
                <DocumentSymbol
                  href={getMandateUrl(m.document_symbol)}
                  className="w-36 shrink-0 truncate"
                >
                  {m.document_symbol}
                </DocumentSymbol>
              )}
              <span
                className="min-w-0 flex-1 truncate text-xs text-gray-600"
                title={m.title ?? undefined}
              >
                {m.title}
              </span>
              {!series.is_collection && m.is_latest && (
                <span className="shrink-0 rounded bg-un-blue px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Latest
                </span>
              )}
              {!isCurrent && (
                <a
                  href={`${DIFF_VIEWER}?symbol1=${encodeURIComponent(
                    m.document_symbol
                  )}&symbol2=${encodeURIComponent(currentSymbol)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Compare ${m.document_symbol} with ${currentSymbol}`}
                  aria-label={`View differences between ${m.document_symbol} and ${currentSymbol}`}
                  className="shrink-0 text-gray-400 transition-colors hover:text-un-blue"
                >
                  <GitCompare className="h-3.5 w-3.5" />
                </a>
              )}
            </li>
          )
        })}
      </ul>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-un-blue hover:underline"
        >
          <ChevronDown className="h-3 w-3" />
          Show all {series.members.length}
        </button>
      )}
      {showAll && series.members.length > MEMBERS_DEFAULT_SHOWN && (
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
        {series.is_collection
          ? 'Grouped automatically by matching titles within the same organ. This group bundles related resolutions that are not individually ordered.'
          : 'Versions are identified automatically by matching titles within the same organ (~97% accuracy on a manual audit).'}{' '}
        The compare icon opens the two texts side by side in the diff viewer.
      </DetailFootnote>
    </section>
  )
}
