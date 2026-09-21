'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  DetailSubsectionHeading,
  formatSubjectLabel,
} from '@/components/MandateDetailUi'
import { Chip } from '@/components/ui/chip'
import { DocumentSymbol } from '@/components/DocumentSymbol'
import { getMandateUrl } from '@/components/table/MandateColumns'
import { explainerTexts } from '@/lib/en_text_contents'
import type { RelatedMandate } from '@/lib/data/related'

/**
 * Other mandate documents that share topics with this one — experimental.
 *
 * Ranking is not "how many subjects do they share": the headings that two
 * arbitrary UN documents share are almost always the generic ones
 * ("International Cooperation", "Report Preparation"), so a count puts the same
 * omnibus resolutions on every page. Each shared subject is weighted by how
 * rare it is across the corpus (see lib/data/related.ts), and the rarest shared
 * headings are listed under each row so the reader can judge the match instead
 * of trusting it.
 *
 * Presentation follows the version-history list on purpose — year, symbol,
 * title — because both answer "which other document should I open next".
 */

const DEFAULT_SHOWN = 5

export function RelatedMandates({ related }: { related: RelatedMandate[] }) {
  const [showAll, setShowAll] = useState(false)
  if (related.length === 0) return null

  const shown = showAll ? related : related.slice(0, DEFAULT_SHOWN)
  const hidden = related.length - shown.length

  return (
    <div className="space-y-2 pt-2">
      <DetailSubsectionHeading
        disclaimer={explainerTexts.mandateDetail.relatedMandates.disclaimer}
      >
        Related mandate documents
      </DetailSubsectionHeading>

      {/* 32px rows, the height every row list in the detail panel is set to:
          see MandateVersionHistory, CitationCounts and MandateSgReports for
          the other three. py-1.5 reaches it here because the DocumentSymbol
          is an inline-block 20px tall inside a 16px line and sets the row
          height; a list without one needs py-2 to land in the same place. */}
      <ul className="divide-y divide-gray-100 border-y border-gray-100">
        {shown.map((item) => (
          <li key={item.document_symbol} className="py-1.5 text-sm">
            <div className="flex items-baseline gap-3">
              <span className="w-10 shrink-0 text-xs text-gray-500">
                {item.year ?? '—'}
              </span>
              <DocumentSymbol
                href={getMandateUrl(item.document_symbol)}
                className="w-36 shrink-0 truncate"
              >
                {item.document_symbol}
              </DocumentSymbol>
              <span
                className="min-w-0 flex-1 truncate text-xs text-gray-600"
                title={item.title ?? undefined}
              >
                {item.title}
              </span>
            </div>
            {item.shared_subjects.length > 0 && (
              <div className="mt-1 flex flex-wrap items-baseline gap-1 pl-[3.25rem]">
                {item.shared_subjects.map((subject) => (
                  <Chip
                    key={subject}
                    density="dense"
                    href={`/secretariat?subject=${encodeURIComponent(subject)}`}
                  >
                    {formatSubjectLabel(subject)}
                  </Chip>
                ))}
                {item.shared_count > item.shared_subjects.length && (
                  <span className="text-[11px] text-gray-500">
                    +{item.shared_count - item.shared_subjects.length} more
                    shared
                  </span>
                )}
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
          Show all {related.length}
        </button>
      )}
      {showAll && related.length > DEFAULT_SHOWN && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="inline-flex items-center gap-1 text-xs font-medium text-un-blue hover:underline"
        >
          <ChevronUp className="h-3 w-3" />
          Show fewer
        </button>
      )}
    </div>
  )
}
