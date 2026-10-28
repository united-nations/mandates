'use client'

import { useId, useState } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { DetailSectionHeading } from '@/components/MandateDetailUi'
import { EvidenceBreakdown } from '@/components/ParagraphImplementationEvidence'
import {
  EVIDENCE_KINDS,
  evidenceAnchor,
  groupParagraphEvidence,
  implementationAnchor,
  matchParagraphEvidence,
  reportEvidencePdfUrl,
  splitEvidenceQuote,
  summarizeEvidence,
  type EvidencePassage,
  type ImplementationEvidenceCase,
  type ParagraphEvidence,
} from '@/lib/implementation-evidence'
import type { Paragraph } from '@/types'

export function MandateImplementationEvidence({
  evidence,
  paragraphs,
}: {
  evidence: ImplementationEvidenceCase | null
  paragraphs: Paragraph[]
}) {
  if (!evidence) return null
  // Use the same structural/text guard as fulltext. Reviewed excerpts must not
  // survive changes to the source paragraph by being displayed in another section.
  const matched = evidence.paragraphs.filter((target) =>
    paragraphs.some(
      (paragraph) => matchParagraphEvidence(evidence, paragraph) === target
    )
  )
  const passages = matched.flatMap((paragraph) => paragraph.passages)
  const total = summarizeEvidence(passages).total
  return (
    <section id="implementation-evidence" className="scroll-mt-28">
      <DetailSectionHeading
        hint={`${matched.length} provision${matched.length === 1 ? '' : 's'} · ${total} report passage${total === 1 ? '' : 's'}`}
        disclaimer={
          <>
            Selected passages reviewed {evidence.reviewedAt}. Other provisions
            have not been reviewed. Counts describe matching passages, not
            mandate completion. Results are reported outputs or indicators, not
            independently verified impact. Consult the PDFs for footnotes,
            tables and original layout.
          </>
        }
      >
        What do the reports say about implementation?
      </DetailSectionHeading>
      <p className="mb-3 text-sm text-muted-foreground">
        {evidence.report.symbol} · Issued {evidence.report.issuedDate}. Expand a
        finding to see the part of the mandate it addresses and the supporting
        report text.
      </p>
      {matched.length > 0 && <EvidenceBreakdown passages={passages} />}
      {matched.length < evidence.paragraphs.length && (
        <p className="mt-3 text-sm text-muted-foreground">
          Some reviewed provisions no longer match this fulltext. Their evidence
          is withheld pending review.
        </p>
      )}
      <div className="mt-4 space-y-5">
        {matched.map((paragraph) => (
          <ImplementationProvision
            key={evidenceAnchor(paragraph)}
            evidence={evidence}
            paragraph={paragraph}
          />
        ))}
      </div>
    </section>
  )
}

function HighlightedRequest({ text, quote }: { text: string; quote?: string }) {
  return (
    <>
      {splitEvidenceQuote(text, quote).map((part, index) =>
        part.highlighted ? (
          <mark
            key={index}
            className="bg-accent font-medium text-un-blue-text underline decoration-un-blue underline-offset-2"
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </>
  )
}

function ImplementationProvision({
  evidence,
  paragraph,
}: {
  evidence: ImplementationEvidenceCase
  paragraph: ParagraphEvidence
}) {
  const id = useId()
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const groups = groupParagraphEvidence(paragraph)
  return (
    <article
      id={implementationAnchor(paragraph)}
      className="scroll-mt-28 rounded-lg border border-border"
      data-implementation-provision={paragraph.label}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold">{paragraph.label}</h3>
        <a
          href={`#${evidenceAnchor(paragraph)}`}
          className="text-xs font-medium text-un-blue-text hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          View in fulltext
        </a>
      </div>
      <div className="divide-y divide-border">
        {groups.map((group, index) => {
          const open = activeKey === group.key
          return (
            <div key={group.key} data-evidence-component={group.key}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`${id}-${index}`}
                onClick={() => setActiveKey(open ? null : group.key)}
                className="flex w-full cursor-pointer items-start justify-between gap-3 px-3 py-3 text-left hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="min-w-0 space-y-1.5">
                  <span className="block text-sm font-semibold text-un-blue-text">
                    {group.title}
                  </span>
                  <span className="block text-sm leading-relaxed text-foreground">
                    {group.summary}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {group.passages.length} report passage
                    {group.passages.length === 1 ? '' : 's'}
                  </span>
                  <EvidenceBreakdown passages={group.passages} />
                </span>
                <ChevronDown
                  aria-hidden
                  className={`mt-0.5 h-4 w-4 shrink-0 text-un-blue-text transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </button>
              {open && (
                <div
                  id={`${id}-${index}`}
                  className="grid min-w-0 gap-4 border-t border-border bg-muted p-3 min-[640px]:grid-cols-2"
                >
                  <section className="min-w-0 space-y-2">
                    <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Requested action · {paragraph.label}
                    </h4>
                    {group.quote ? (
                      <>
                        <blockquote className="border-l-2 border-un-blue pl-3 text-sm leading-relaxed">
                          <mark className="bg-accent text-un-blue-text">
                            {group.quote}
                          </mark>
                        </blockquote>
                        <details className="text-sm">
                          <summary className="cursor-pointer font-medium text-un-blue-text">
                            Read the whole paragraph
                          </summary>
                          <blockquote className="mt-2 leading-relaxed">
                            <HighlightedRequest
                              text={paragraph.requestedText}
                              quote={group.quote}
                            />
                          </blockquote>
                        </details>
                      </>
                    ) : (
                      <blockquote className="border-l-2 border-border pl-3 text-sm leading-relaxed">
                        {paragraph.requestedText}
                      </blockquote>
                    )}
                  </section>
                  <section className="min-w-0 space-y-3">
                    <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Reported evidence · {evidence.report.symbol}
                    </h4>
                    {group.passages.map((passage) => (
                      <ReportPassage
                        key={passage.id}
                        passage={passage}
                        reportSymbol={evidence.report.symbol}
                        component={group.key}
                        initiallyOpen={group.passages.length === 1}
                      />
                    ))}
                  </section>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </article>
  )
}

function ReportPassage({
  passage,
  reportSymbol,
  component,
  initiallyOpen,
}: {
  passage: EvidencePassage
  reportSymbol: string
  component: string
  initiallyOpen: boolean
}) {
  return (
    <article className="min-w-0 space-y-2 rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-medium">
          {EVIDENCE_KINDS[passage.kind]}
          {passage.resultLevel &&
            ` · ${passage.resultLevel === 'output' ? 'Output' : 'Indicator'}`}
        </span>
        <a
          href={reportEvidencePdfUrl(reportSymbol, passage.pdfPage)}
          aria-label={`Open ${reportSymbol}, paragraph ${passage.number}, PDF page ${passage.pdfPage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-un-blue-text hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          PDF p. {passage.pdfPage}
          <ExternalLink aria-hidden className="h-3 w-3" />
        </a>
      </div>
      <details open={initiallyOpen}>
        <summary className="cursor-pointer text-sm font-medium text-un-blue-text">
          Report paragraph {passage.number} · Read passage
        </summary>
        <blockquote className="mt-2 text-sm leading-relaxed">
          {passage.text}
        </blockquote>
        <details className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-un-blue-text">
            Why this matches / limits
          </summary>
          {passage.mappings
            .filter((mapping) => mapping.component === component)
            .map((mapping, index) => (
              <div key={index} className="mt-2 space-y-1">
                <p>{mapping.interpretation}</p>
                <p>Match basis: {mapping.basis}.</p>
              </div>
            ))}
        </details>
      </details>
    </article>
  )
}
