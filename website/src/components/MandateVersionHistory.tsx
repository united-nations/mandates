'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import type { ResolutionSeriesInfo } from '@/lib/data/mandates'
import { explainerTexts } from '@/lib/en_text_contents'
import { WordCount, TextSimilarity } from '@/components/DocumentTextMetrics'
import { DocumentSymbol } from '@/components/DocumentSymbol'
import { getMandateUrl } from '@/components/table/MandateColumns'
import {
  DetailFootnote,
  DetailSectionHeading,
} from '@/components/MandateDetailUi'

const MEMBERS_DEFAULT_SHOWN = 5

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

  // Slice only affects visibility. Comparison targets are resolved server-side
  // from complete series dates, never from this list or its visible neighbours.
  const shown = showAll
    ? series.members
    : series.members.slice(0, MEMBERS_DEFAULT_SHOWN)
  const hiddenCount = series.members.length - shown.length

  return (
    <section className="space-y-3">
      <DetailSectionHeading
        hint={`${series.series_count} ${unit}${span ? ` · ${span}` : ''}`}
        howTo={
          series.is_collection
            ? 'Each row is one document in this group, newest first. Word length counts substantive English text, including annexes. These documents are not ordered versions, so text similarity is unavailable.'
            : 'Each row is one version, newest first. Word length counts substantive English text, including annexes. Text similarity compares with the previous version in the complete series. Select a similarity score or Compare to open both documents side by side. A dash means the metric is unavailable.'
        }
        disclaimer={
          series.is_collection
            ? explainerTexts.mandateDetail.versionHistory.collectionDisclaimer
            : explainerTexts.versionMatching.disclaimer
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed border-y border-gray-100 text-left text-xs">
          <thead className="text-gray-500">
            <tr className="border-b border-gray-100">
              <th scope="col" className="w-12 py-2 font-medium">
                Year
              </th>
              <th scope="col" className="w-36 py-2 pr-3 font-medium">
                Symbol
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Title
              </th>
              <th scope="col" className="w-24 py-2 pr-3 font-medium">
                Word length
              </th>
              <th scope="col" className="w-28 py-2 font-medium">
                Text similarity
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shown.map((m) => {
              const isCurrent = m.document_symbol === currentSymbol
              return (
                <tr
                  key={m.document_symbol}
                  className={isCurrent ? 'bg-blue-50/60' : ''}
                >
                  <td className="py-2 align-top text-gray-500">
                    {m.year ?? '—'}
                  </td>
                  <td className="min-w-0 py-2 pr-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isCurrent ? (
                        <DocumentSymbol subdued>
                          {m.document_symbol}
                        </DocumentSymbol>
                      ) : (
                        <DocumentSymbol href={getMandateUrl(m.document_symbol)}>
                          {m.document_symbol}
                        </DocumentSymbol>
                      )}
                      {!series.is_collection && m.is_latest && (
                        <span className="rounded bg-un-blue px-1.5 py-0.5 text-micro font-medium text-white">
                          Latest
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="min-w-0 py-2 pr-3 align-top">
                    <p
                      className="truncate text-gray-600"
                      title={m.title ?? undefined}
                    >
                      {m.title}
                    </p>
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <WordCount metrics={m.text_metrics} />
                  </td>
                  <td className="py-2 align-top">
                    <TextSimilarity
                      symbol={m.document_symbol}
                      metrics={m.text_metrics}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

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
          disclaimer that used to sit beside it now lives behind the heading's
          "i": see `disclaimer` above. */}
      {series.is_collection && (
        <DetailFootnote>
          This group bundles related documents that are not individually
          ordered.
        </DetailFootnote>
      )}
    </section>
  )
}
