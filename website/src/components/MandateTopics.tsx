'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  DetailSectionHeading,
  formatSubjectLabel,
} from '@/components/MandateDetailUi'
import { Chip } from '@/components/ui/chip'
import { RelatedMandates } from '@/components/RelatedMandates'
import { SHOW_RELATED_MANDATES } from '@/lib/feature-flags'
import type { RelatedMandate } from '@/lib/data/related'

/**
 * "What subjects does this mandate have?" — the UNBIS subject headings the UN
 * Library assigned to the document, as plain chips, and below them the
 * documents that share those subjects.
 *
 * The chips carried a domain-coloured dot when this comment was written. They
 * do not any more: the domain hue went with the rest of the ornament axis, and
 * this page no longer fetches subject domain codes at all, so there is nothing
 * here to colour a dot from.
 *
 * The chips are the navigation: each one filters the explorer to every mandate
 * carrying that heading, which is how a reader gets from one document to the
 * rest of a policy area.
 */

const DEFAULT_SHOWN = 20

interface MandateTopicsProps {
  subjects: string[]
  related: RelatedMandate[]
}

export function MandateTopics({ subjects, related }: MandateTopicsProps) {
  const [showAll, setShowAll] = useState(false)
  if (subjects.length === 0 && related.length === 0) return null

  const sorted = [...subjects].sort((a, b) => a.localeCompare(b))
  const shown = showAll ? sorted : sorted.slice(0, DEFAULT_SHOWN)

  return (
    <section className="space-y-3">
      {/* The heading suffix is always a count, across every section — it used
          to carry provenance here ("UN Library subjects") while the sibling
          section carried a count, so the same slot meant two different things.
          Provenance moved to the footnote, where the other explanations live. */}
      <DetailSectionHeading
        hint={
          sorted.length > 0
            ? `${sorted.length} ${sorted.length === 1 ? 'subject' : 'subjects'}`
            : undefined
        }
        howTo={
          sorted.length > 0
            ? 'Each chip is a subject heading assigned to this document. Click one to list every mandate document that shares it.'
            : undefined
        }
      >
        What subjects does this mandate have?
      </DetailSectionHeading>

      {sorted.length > 0 && (
        <div className="flex flex-wrap items-start gap-x-1 gap-y-1.5">
          {shown.map((subject) => {
            return (
              <Chip
                key={subject}
                className="text-xs"
                href={`/secretariat?subject=${encodeURIComponent(subject.trim())}`}
                title={`Show mandates on ${formatSubjectLabel(subject)}`}
              >
                <span>{formatSubjectLabel(subject)}</span>
              </Chip>
            )
          })}
          {sorted.length > DEFAULT_SHOWN && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="ml-1 inline-flex items-center gap-1 self-center text-sm font-medium text-un-blue-text hover:underline"
            >
              {showAll ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Show fewer
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Show all {sorted.length}
                </>
              )}
            </button>
          )}
        </div>
      )}

      {SHOW_RELATED_MANDATES && <RelatedMandates related={related} />}
    </section>
  )
}
