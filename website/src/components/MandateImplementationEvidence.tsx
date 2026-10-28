'use client'

import { useId, useState } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { DetailSectionHeading } from '@/components/MandateDetailUi'
import { EvidenceBadges } from '@/components/ParagraphImplementationEvidence'
import { Chip } from '@/components/ui/chip'
import {
  EVIDENCE_BADGE_LABELS,
  evidenceAnchor,
  groupParagraphEvidence,
  implementationAnchor,
  matchParagraphEvidence,
  reportEvidencePdfUrl,
  splitEvidenceQuotes,
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
  // Keep source-text and structural checks identical to the fulltext signposts.
  const matched = [
    ...new Set(
      paragraphs.flatMap((paragraph) => {
        const target = matchParagraphEvidence(evidence, paragraph)
        return target ? [target] : []
      })
    ),
  ]
  return (
    <section id="implementation-evidence" className="scroll-mt-28">
      <DetailSectionHeading
        disclaimer={
          <>
            Selected passages reviewed {evidence.reviewedAt}. Other provisions
            have not been reviewed. Badges show what information is available in
            the report, not completion status. Results are reported outputs or
            indicators, not independently verified impact. Highlighting is at
            clause level where reviewed clause matches exist; otherwise the
            whole provision is linked. Consult the PDFs for footnotes, tables
            and original layout.
          </>
        }
      >
        What do the reports say about implementation?
      </DetailSectionHeading>
      <p className="mb-4 text-sm text-muted-foreground">
        {evidence.report.symbol} · Issued {evidence.report.issuedDate}. Expand a
        paragraph, then a relevant passage, to read the report evidence.
      </p>
      {matched.length < evidence.paragraphs.length && (
        <p className="mb-3 text-sm text-muted-foreground">
          Some reviewed provisions no longer match this fulltext. Their evidence
          is withheld pending review.
        </p>
      )}
      <div className="space-y-4">
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

function HighlightedRequest({ paragraph }: { paragraph: ParagraphEvidence }) {
  const quotes = groupParagraphEvidence(paragraph).flatMap((group) =>
    group.quote ? [group.quote] : []
  )
  const parts = quotes.length
    ? splitEvidenceQuotes(paragraph.requestedText, quotes)
    : [{ text: paragraph.requestedText, highlighted: true }]
  return (
    <>
      {parts.map((part, index) =>
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
  const [open, setOpen] = useState(false)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const groups = groupParagraphEvidence(paragraph)
  return (
    <article
      id={implementationAnchor(paragraph)}
      className="scroll-mt-28 rounded-lg border border-border"
      data-implementation-provision={paragraph.label}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 px-3 pt-3">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{paragraph.label}</h3>
          <EvidenceBadges passages={paragraph.passages} />
        </div>
        <a
          href={`#${evidenceAnchor(paragraph)}`}
          className="text-xs font-medium text-un-blue-text hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          View in fulltext
        </a>
      </div>
      <blockquote
        className="px-3 py-3 text-sm leading-relaxed"
        data-requested-paragraph
      >
        <HighlightedRequest paragraph={paragraph} />
      </blockquote>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 border-t border-border px-3 py-2 text-left text-sm font-medium text-un-blue-text hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        data-paragraph-toggle
      >
        {open ? 'Hide relevant passages' : 'Show relevant passages'}
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div id={id} className="divide-y divide-border border-t border-border">
          {groups.map((group, index) => {
            const expanded = activeKey === group.key
            return (
              <div key={group.key} data-evidence-component={group.key}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`${id}-${index}`}
                  onClick={() => setActiveKey(expanded ? null : group.key)}
                  className="flex w-full cursor-pointer items-start justify-between gap-3 px-3 py-3 text-left hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="min-w-0 space-y-2">
                    <span className="block text-xs font-medium text-muted-foreground">
                      {group.quote ? group.title : 'Whole paragraph'}
                    </span>
                    <span className="block text-sm leading-relaxed text-foreground">
                      “{group.quote ?? paragraph.requestedText}”
                    </span>
                    <EvidenceBadges passages={group.passages} />
                  </span>
                  <ChevronDown
                    aria-hidden
                    className={`mt-0.5 h-4 w-4 shrink-0 text-un-blue-text transition-transform ${expanded ? 'rotate-180' : ''}`}
                  />
                </button>
                {expanded && (
                  <div
                    id={`${id}-${index}`}
                    className="space-y-3 border-t border-border bg-muted p-3"
                  >
                    <p className="text-sm leading-relaxed">{group.summary}</p>
                    {group.passages.map((passage) => (
                      <ReportPassage
                        key={passage.id}
                        passage={passage}
                        reportSymbol={evidence.report.symbol}
                        component={group.key}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}

function ReportPassage({
  passage,
  reportSymbol,
  component,
}: {
  passage: EvidencePassage
  reportSymbol: string
  component: string
}) {
  return (
    <article
      className="min-w-0 space-y-2 rounded-md border border-border bg-background p-3"
      data-report-passage={passage.number}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex flex-wrap items-baseline gap-2">
          <span className="text-xs text-muted-foreground">
            {reportSymbol} · Paragraph {passage.number}
          </span>
          <Chip density="dense">
            {EVIDENCE_BADGE_LABELS[passage.kind]}
            {passage.resultLevel &&
              ` · ${passage.resultLevel === 'output' ? 'Output' : 'Indicator'}`}
          </Chip>
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
      <blockquote className="text-sm leading-relaxed">
        {passage.text}
      </blockquote>
      <details className="border-t border-border pt-2 text-xs text-muted-foreground">
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
    </article>
  )
}
