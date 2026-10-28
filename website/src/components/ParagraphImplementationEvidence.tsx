'use client'

import { useId, useState } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import {
  EVIDENCE_KINDS,
  evidenceAnchor,
  reportEvidencePdfUrl,
  summarizeEvidence,
  type EvidenceKind,
  type ImplementationEvidenceCase,
  type ParagraphEvidence,
} from '@/lib/implementation-evidence'

export function ImplementationEvidenceIntro({
  evidence,
  matchedCount,
}: {
  evidence: ImplementationEvidenceCase
  matchedCount: number
}) {
  return (
    <div className="space-y-1 border-l-2 border-un-blue pl-3 text-sm">
      <p className="font-medium">
        Requested action / reported evidence · Pilot
      </p>
      <p className="text-muted-foreground">
        {matchedCount} provisions mapped to {evidence.report.symbol} in the
        reviewed sample. Expand evidence beneath a paragraph to compare the
        passages. Other provisions have not been reviewed.
      </p>
      <p className="text-muted-foreground">
        Results are reported outputs or indicators, not independently verified
        impact. Passage counts measure available material, not completion.
      </p>
      {matchedCount < evidence.paragraphs.length && (
        <p className="text-muted-foreground">
          Some reviewed provisions no longer match this fulltext. Their evidence
          is withheld pending review.
        </p>
      )}
    </div>
  )
}

export function ParagraphImplementationEvidence({
  evidence,
  paragraph,
  requestedText,
}: {
  evidence: ImplementationEvidenceCase
  paragraph: ParagraphEvidence
  requestedText: string
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<EvidenceKind | 'all'>('all')
  const summary = summarizeEvidence(paragraph.passages)
  const kinds = (Object.keys(EVIDENCE_KINDS) as EvidenceKind[]).filter(
    (kind) =>
      kind === 'activity' || kind === 'results' || summary.counts[kind] > 0
  )
  const passages = paragraph.passages.filter(
    (passage) => filter === 'all' || passage.kind === filter
  )

  return (
    <div
      id={evidenceAnchor(paragraph)}
      className="mt-3 scroll-mt-28 border-t border-border pt-3"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-start justify-between gap-3 rounded-sm text-left text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="space-y-1">
          <span className="block font-medium text-un-blue-text">
            {summary.total} matching report passage
            {summary.total === 1 ? '' : 's'}
          </span>
          <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {kinds.map((kind) => (
              <span key={kind}>
                {EVIDENCE_KINDS[kind]}: {summary.counts[kind]}
              </span>
            ))}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={`mt-0.5 h-4 w-4 shrink-0 text-un-blue-text transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div id={id} className="mt-4 space-y-4">
          <div
            role="group"
            className="flex flex-wrap gap-2"
            aria-label="Filter evidence type"
          >
            {(['all', ...kinds] as const).map((kind) => (
              <button
                type="button"
                key={kind}
                aria-pressed={filter === kind}
                onClick={() => setFilter(kind)}
                className="cursor-pointer rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-pressed:font-semibold aria-pressed:text-un-blue-text aria-pressed:underline"
              >
                {kind === 'all'
                  ? `All (${summary.total})`
                  : `${EVIDENCE_KINDS[kind]} (${summary.counts[kind]})`}
              </button>
            ))}
          </div>
          <div className="grid min-w-0 gap-4 min-[640px]:grid-cols-2">
            <section className="min-w-0 space-y-2">
              <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Requested action
              </h4>
              <p className="text-sm font-medium">
                {evidence.symbol} · {paragraph.label}
              </p>
              <blockquote className="border-l-2 border-border pl-3 text-sm leading-relaxed whitespace-pre-line">
                {requestedText}
              </blockquote>
            </section>
            <section className="min-w-0 space-y-3">
              <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Reported evidence
              </h4>
              <p className="text-xs text-muted-foreground">
                {evidence.report.symbol} · Issued {evidence.report.issuedDate}
              </p>
              {passages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No{' '}
                  {filter === 'all'
                    ? 'passages'
                    : EVIDENCE_KINDS[filter].toLowerCase()}{' '}
                  mapped to this provision in the pilot.
                </p>
              )}
              {passages.map((passage) => (
                <article
                  key={passage.id}
                  className="space-y-2 rounded-md border border-border bg-background p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {EVIDENCE_KINDS[passage.kind]}
                      {passage.resultLevel &&
                        ` · ${passage.resultLevel === 'output' ? 'Output' : 'Indicator'}`}
                    </span>
                    <a
                      href={reportEvidencePdfUrl(
                        evidence.report.symbol,
                        passage.pdfPage
                      )}
                      aria-label={`Open ${evidence.report.symbol}, paragraph ${passage.number}, PDF page ${passage.pdfPage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-un-blue-text hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      PDF p. {passage.pdfPage}
                      <ExternalLink aria-hidden className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Report paragraph {passage.number}
                  </p>
                  <blockquote className="text-sm leading-relaxed">
                    {passage.text}
                  </blockquote>
                  <details className="border-t border-border pt-2 text-xs text-muted-foreground">
                    <summary className="cursor-pointer font-medium text-un-blue-text">
                      Why this matches / limits
                    </summary>
                    {passage.mappings.map((mapping, index) => (
                      <div key={index} className="mt-2 space-y-1">
                        <p className="font-medium text-foreground">
                          {mapping.component}
                        </p>
                        <p>{mapping.interpretation}</p>
                        <p>Match basis: {mapping.basis}.</p>
                      </div>
                    ))}
                  </details>
                </article>
              ))}
            </section>
          </div>
          <p className="text-xs text-muted-foreground">
            Selected passages reviewed {evidence.reviewedAt}. Extracted text;
            consult the PDF for footnotes, tables and original layout. A
            matching passage does not establish full implementation of this
            provision.
          </p>
        </div>
      )}
    </div>
  )
}
