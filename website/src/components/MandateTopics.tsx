'use client'

import { useState } from 'react'
import {
  DetailFootnote,
  DetailSectionHeading,
} from '@/components/MandateDetailUi'
import { RelatedMandates } from '@/components/RelatedMandates'
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
      <DetailSectionHeading
        hint={
          <a
            href="https://metadata.un.org/thesaurus/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-un-blue hover:underline"
          >
            UN Library subjects
          </a>
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
                <a
                  key={subject}
                  href={`/secretariat?subject=${encodeURIComponent(subject.trim())}`}
                  className="inline-flex items-baseline gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-700 transition-colors hover:bg-gray-100"
                >
                  <span>{formatSubjectLabel(subject)}</span>
                  {code && (
                    <span
                      aria-hidden
                      className="size-1.5 self-center rounded-full"
                      style={{ backgroundColor: domainColor(code).hex }}
                    />
                  )}
                </a>
              )
            })}
            {sorted.length > DEFAULT_SHOWN && (
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="ml-1 text-xs text-un-blue hover:underline"
              >
                {showAll
                  ? 'Show fewer'
                  : `Show ${sorted.length - DEFAULT_SHOWN} more`}
              </button>
            )}
          </div>

          <DetailFootnote>
            Navigate topics to identify related mandate documents.
          </DetailFootnote>
        </>
      )}

      <RelatedMandates related={related} />
    </section>
  )
}

/** Subject labels are title-cased upstream, so "UN" arrives as "Un". */
function formatSubjectLabel(subject: string): string {
  return subject.replace(/\bUn\b/g, 'UN')
}
