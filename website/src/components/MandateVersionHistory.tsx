'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown, ChevronUp, GitCompare } from 'lucide-react'
import type { ResolutionSeriesInfo } from '@/lib/data/mandates'
import { explainerTexts } from '@/lib/en_text_contents'
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
 * Version history / related-documents section for a mandate detail view.
 *
 * Vocabulary is driven by the group type (two-tier claim model):
 *  - series (not a collection): "What other versions does this mandate have?",
 *    the latest member is labelled, and a named banner appears when the gates
 *    passed.
 *  - collection: "What else is in this group?", members are an unordered group
 *    and are never presented as versions of each other.
 *
 * NOTHING HERE MAY SAY "RESOLUTION" OR "SESSION". Recurrence is computed over
 * ~38,000 resolution rows *and* ~18,400 decision rows (ECOSOC, GA, Programmes
 * and Funds) plus HRC presidential statements, so "N resolutions" was wrong for
 * roughly a third of the groups it labelled; and Security Council resolutions
 * are not organised by session, so "across sessions" is wrong for a whole
 * organ. The neutral word for every member is "document" — and where the group
 * is an ordered series, "version".
 *
 * The heading also stopped claiming more than the section delivers. "How has
 * this mandate changed?" promises a diff; what is on screen is the list of
 * sibling documents, with the change one click away. "What other versions does
 * this mandate have?" is what the list actually answers, and it stays in the
 * question form its three siblings use.
 *
 * The word "superseded" is deliberately absent from every string here. The DB
 * column is still called `superseded_by`, but the claim we are entitled to make
 * to a reader is only "this is not the latest version" — nothing about legal
 * effect.
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

  const unit = series.is_collection ? 'documents' : 'versions'

  // Members arrive newest first (ORDER BY year DESC, symbol DESC) and include
  // the latest one — the current document is simply one row among them. So the
  // default slice is the 5 most recent, and the *previous* version of any row
  // is the next one down the full list, never the slice.
  const shown = showAll
    ? series.members
    : series.members.slice(0, MEMBERS_DEFAULT_SHOWN)
  const hiddenCount = series.members.length - shown.length

  const compareLabel = series.is_collection
    ? 'Compare with earlier document'
    : 'Compare with previous version'

  return (
    <section className="space-y-3">
      <DetailSectionHeading
        hint={`${series.series_count} ${unit}${span ? ` · ${span}` : ''}`}
        howTo={
          series.is_collection
            ? `Each row is one document in this group, newest first. The compare button on a row opens that document and the one directly before it side by side, so you can see how they differ. ${explainerTexts.mandateDetail.versionHistory.collectionDisclaimer}`
            : `Each row is one version of this document, newest first. The compare button on a row opens that version and the one directly before it side by side, so you can see what changed. ${explainerTexts.versionMatching.disclaimer}`
        }
      >
        {series.is_collection
          ? 'What else is in this group?'
          : 'What other versions does this mandate have?'}
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
          Newer documents in this group exist
          {series.last_year ? ` (latest: ${series.last_year})` : ''}.
        </div>
      )}

      <ul className="divide-y divide-gray-100 border-y border-gray-100">
        {shown.map((m, index) => {
          const isCurrent = m.document_symbol === currentSymbol
          // Index into the full ordered list, so "previous" stays correct when
          // only the first five rows are shown.
          const previous = series.members[index + 1]
          return (
            <li
              key={m.document_symbol}
              className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 py-1.5 text-sm ${
                isCurrent ? 'bg-blue-50/60' : ''
              }`}
            >
              <span className="w-10 shrink-0 text-xs text-gray-500">
                {m.year ?? '—'}
              </span>
              {/* The badge sizes to its content; the fixed width lives on the
                  wrapper. `w-36` on the badge itself stretched every symbol
                  into a bar the width of the longest one. */}
              <span className="w-36 shrink-0">
                {isCurrent ? (
                  <DocumentSymbol subdued>{m.document_symbol}</DocumentSymbol>
                ) : (
                  <DocumentSymbol href={getMandateUrl(m.document_symbol)}>
                    {m.document_symbol}
                  </DocumentSymbol>
                )}
              </span>
              <span
                // min-w-32, not min-w-0: the title may shrink and ellipsize,
                // but not to nothing — below 8rem the row wraps and the
                // compare button drops to its own line instead.
                className="min-w-32 flex-1 truncate text-xs text-gray-600"
                title={m.title ?? undefined}
              >
                {m.title}
              </span>
              {!series.is_collection && m.is_latest && (
                <span className="shrink-0 rounded bg-un-blue px-1.5 py-0.5 text-micro font-medium text-white">
                  Latest
                </span>
              )}
              {/* The oldest member has nothing before it, so it gets no
                  button — the affordance is never a dead control. */}
              {previous && (
                <a
                  href={`${DIFF_VIEWER}?symbol1=${encodeURIComponent(
                    previous.document_symbol
                  )}&symbol2=${encodeURIComponent(m.document_symbol)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Compare ${previous.document_symbol} with ${m.document_symbol}`}
                  className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-un-blue hover:text-un-blue focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-1 focus-visible:outline-none"
                >
                  <GitCompare aria-hidden className="h-3.5 w-3.5" />
                  {compareLabel}
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

      {/* The collection variant's "bundles" sentence is definitional, not a
          disclaimer, so it stays a plain visible footnote. The derivation
          disclaimer that used to sit beside it now lives in the heading's
          "?": see howTo above. */}
      {series.is_collection && (
        <DetailFootnote>
          This group bundles related documents that are not individually
          ordered.
        </DetailFootnote>
      )}
    </section>
  )
}
