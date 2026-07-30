'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  DetailFootnote,
  DetailSectionHeading,
  formatSubjectLabel,
} from '@/components/MandateDetailUi'
import { Chip, ChipDot } from '@/components/ui/chip'
import { RelatedMandates } from '@/components/RelatedMandates'
import { SHOW_RELATED_MANDATES } from '@/lib/feature-flags'
import { domainColor } from '@/lib/subjectDomainColors'
import type { RelatedMandate } from '@/lib/data/related'

/**
 * "What is this mandate about?" — the UNBIS subject headings the UN Library
 * assigned to the document, as the same pills the /subjects pill-map uses
 * (colour dot = thesaurus domain), and below them the documents that share
 * those topics.
 *
 * The pills are the navigation: each one filters the explorer to every mandate
 * carrying that heading, which is how a reader gets from one document to the
 * rest of a policy area.
 */

const DEFAULT_SHOWN = 20

interface MandateTopicsProps {
  subjects: string[]
  /** Domain code per normalized (upper-case) heading; missing = no dot. */
  domainCodes: Record<string, string>
  related: RelatedMandate[]
}

export function MandateTopics({
  subjects,
  domainCodes,
  related,
}: MandateTopicsProps) {
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
            ? `${sorted.length} ${sorted.length === 1 ? 'topic' : 'topics'}`
            : undefined
        }
      >
        What is this mandate about?
      </DetailSectionHeading>

      {sorted.length > 0 && (
        <>
          <div className="flex flex-wrap items-start gap-x-1 gap-y-1.5">
            {shown.map((subject) => {
              const code = domainCodes[subject.trim().toUpperCase()]
              return (
                <Chip
                  key={subject}
                  kind="topic"
                  href={`/secretariat?subject=${encodeURIComponent(subject.trim())}`}
                  title={`Show mandates on ${formatSubjectLabel(subject)}`}
                >
                  <span>{formatSubjectLabel(subject)}</span>
                  {code && <ChipDot color={domainColor(code).hex} />}
                </Chip>
              )
            })}
            {sorted.length > DEFAULT_SHOWN && (
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="ml-1 inline-flex items-center gap-1 self-center text-xs font-medium text-un-blue hover:underline"
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

          {/* The coloured dot on each chip was previously unexplained, so it
              read as decoration. Legend and provenance both live here. */}
          <DetailFootnote>
            Click a topic to see every mandate document that shares it. Topics
            come from the{' '}
            <a
              href="https://metadata.un.org/thesaurus/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted underline-offset-2 hover:text-un-blue"
            >
              UN Library thesaurus
            </a>
            ; the dot marks which broad subject domain each one belongs to.
          </DetailFootnote>
        </>
      )}

      {SHOW_RELATED_MANDATES && <RelatedMandates related={related} />}
    </section>
  )
}
