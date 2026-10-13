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
  MandateDetailTableColumns,
  mandateDetailTableClassName,
  mandateDetailTableHeaderClassName,
  mandateDetailTableCellClassName,
} from '@/components/MandateDetailTable'
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
        <div className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground">
          This is an older version — the most recent is{' '}
          <Link
            href={getMandateUrl(series.superseded_by)}
            className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:text-un-blue-text"
          >
            {series.superseded_by}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
      {!series.superseded_by && series.has_newer && (
        <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          Newer documents in this group exist
          {series.last_year ? ` (latest: ${series.last_year})` : ''}.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className={mandateDetailTableClassName}>
          <MandateDetailTableColumns />
          <thead className={mandateDetailTableHeaderClassName}>
            <tr className="border-b border-border">
              <th scope="col" className="py-1 pr-3 align-top font-medium">
                Year
              </th>
              <th scope="col" className="py-1 pr-3 align-top font-medium">
                Symbol
              </th>
              <th scope="col" className="py-1 pr-3 align-top font-medium">
                Title
              </th>
              <th
                scope="col"
                className="py-1 pr-3 text-right align-top font-medium"
              >
                Word length
              </th>
              <th scope="col" className="py-1 text-right align-top font-medium">
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
                  className={isCurrent ? 'h-8 bg-accent/60' : 'h-8'}
                >
                  <td
                    className={`${mandateDetailTableCellClassName} tabular-nums`}
                  >
                    {m.year ?? '—'}
                  </td>
                  <td className={mandateDetailTableCellClassName}>
                    <div className="flex min-w-0 items-baseline gap-1.5">
                      {isCurrent ? (
                        <DocumentSymbol
                          subdued
                          className="max-w-full"
                          title={m.document_symbol}
                        >
                          <span className="block truncate">
                            {m.document_symbol}
                          </span>
                        </DocumentSymbol>
                      ) : (
                        <DocumentSymbol
                          href={getMandateUrl(m.document_symbol)}
                          className="max-w-full"
                          title={m.document_symbol}
                        >
                          <span className="block truncate">
                            {m.document_symbol}
                          </span>
                        </DocumentSymbol>
                      )}
                    </div>
                  </td>
                  <td className={mandateDetailTableCellClassName}>
                    <p
                      className="truncate text-foreground"
                      title={m.title ?? undefined}
                    >
                      {m.title}
                    </p>
                  </td>
                  <td
                    className={`${mandateDetailTableCellClassName} text-right`}
                  >
                    <WordCount metrics={m.text_metrics} />
                  </td>
                  <td className="py-1 text-right align-baseline text-foreground">
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
          className="inline-flex items-center gap-1 text-sm font-medium text-un-blue-text hover:underline"
        >
          <ChevronDown className="h-3 w-3" />
          Show all {series.members.length}
        </button>
      )}
      {showAll && series.members.length > MEMBERS_DEFAULT_SHOWN && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="inline-flex items-center gap-1 text-sm font-medium text-un-blue-text hover:underline"
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
