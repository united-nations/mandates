'use client'

import { useId, useState } from 'react'
import { ChevronRight, ExternalLink, Info, X } from 'lucide-react'
import { DetailSectionHeading } from '@/components/MandateDetailUi'
import { EvidenceBadges } from '@/components/ParagraphImplementationEvidence'
import { DisclosurePopover } from '@/components/ui/disclosure-popover'
import { ParagraphNumberBadge } from '@/components/ui/paragraph-number-badge'
import {
  evidenceAnchor,
  groupParagraphEvidence,
  implementationAnchor,
  matchParagraphEvidence,
  reportEvidencePdfUrl,
  evidenceNavigationParts,
  evidenceBadgeItems,
  selectReportEvidence,
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
  const reviewed = [
    ...new Set(
      paragraphs.flatMap((paragraph) => {
        const target = matchParagraphEvidence(evidence, paragraph)
        return target ? [target] : []
      })
    ),
  ]
  const matched = reviewed.filter((paragraph) => paragraph.passages.length > 0)
  const withoutMatches = reviewed.filter(
    (paragraph) => paragraph.passages.length === 0
  )
  return (
    <section id="implementation-evidence" className="scroll-mt-28">
      <DetailSectionHeading>
        What do the reports say about implementation?
      </DetailSectionHeading>
      <p className="mb-4 text-sm text-muted-foreground">
        {evidence.report.symbol} · Issued {evidence.report.issuedDate}. Select a
        highlight or “Whole paragraph” to read the report evidence alongside the
        paragraph.
      </p>
      <details className="mb-4 text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-un-blue-text">
          {reviewed.length} provisions checked · {matched.length} with report
          passages
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-muted-foreground">
            Checked against the complete {evidence.report.symbol} report on{' '}
            {evidence.reviewedAt}.
          </p>
          {withoutMatches.length > 0 && (
            <>
              <p>
                No matching passage identified for {withoutMatches.length}{' '}
                provisions:
              </p>
              <ul className="space-y-2">
                {withoutMatches.map((paragraph) => (
                  <li key={evidenceAnchor(paragraph)}>
                    <span className="font-medium">{paragraph.label}.</span>{' '}
                    {paragraph.review.note}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </details>
      {reviewed.length < evidence.paragraphs.length && (
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

function ImplementationProvision({
  evidence,
  paragraph,
}: {
  evidence: ImplementationEvidenceCase
  paragraph: ParagraphEvidence
}) {
  const id = useId()
  const [activeKeys, setActiveKeys] = useState<string[]>([])
  const groups = groupParagraphEvidence(paragraph)
  const wholeParagraphKeys = groups
    .filter((group) => !group.quote || group.quote === paragraph.requestedText)
    .map((group) => group.key)
  const selected = groups.filter((group) => activeKeys.includes(group.key))
  const reportPassages = [
    ...new Map(
      selected
        .flatMap((group) => group.passages)
        .map((passage) => [passage.id, passage])
    ).values(),
  ].sort((a, b) => a.number - b.number)
  const parts = evidenceNavigationParts(paragraph.requestedText, groups)
  return (
    <article
      id={implementationAnchor(paragraph)}
      className="scroll-mt-28"
      data-implementation-provision={paragraph.label}
    >
      <div
        className={`grid min-w-0 gap-4 ${activeKeys.length ? 'min-[640px]:grid-cols-2' : ''}`}
      >
        <div
          className="min-w-0 self-start rounded-lg bg-muted p-3"
          data-mandate-card
        >
          <h3 className="sr-only">{paragraph.label}</h3>
          {paragraph.locator.position !== undefined && (
            <p className="mb-2 text-xs text-muted-foreground">
              {paragraph.label}
            </p>
          )}
          <div className="flex items-start gap-2">
            {paragraph.locator.prefix && (
              <span title={paragraph.label}>
                <ParagraphNumberBadge>
                  {paragraph.locator.prefix.replace(/\.$/, '')}
                </ParagraphNumberBadge>
              </span>
            )}
            <blockquote
              className="min-w-0 flex-1 text-sm leading-relaxed"
              data-requested-paragraph
            >
              {parts.map((part, index) =>
                part.keys.length ? (
                  <a
                    key={index}
                    href={`#${id}`}
                    aria-controls={id}
                    aria-expanded={part.keys.some((key) =>
                      activeKeys.includes(key)
                    )}
                    onClick={(event) => {
                      event.preventDefault()
                      setActiveKeys(part.keys)
                    }}
                    className="cursor-pointer rounded-sm bg-accent font-medium text-un-blue-text underline decoration-un-blue underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-expanded:font-bold aria-expanded:decoration-2"
                    data-evidence-highlight
                  >
                    {part.text}
                  </a>
                ) : (
                  <span key={index}>{part.text}</span>
                )
              )}{' '}
              {wholeParagraphKeys.length > 0 && (
                <button
                  type="button"
                  aria-controls={id}
                  aria-expanded={wholeParagraphKeys.some((key) =>
                    activeKeys.includes(key)
                  )}
                  onClick={() => setActiveKeys(wholeParagraphKeys)}
                  className="mr-2 inline-flex cursor-pointer items-center gap-1 rounded-sm text-sm font-medium text-un-blue-text hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-expanded:underline"
                  data-evidence-whole-paragraph
                >
                  Whole paragraph
                  <ChevronRight aria-hidden className="h-3.5 w-3.5" />
                </button>
              )}
              <EvidenceBadges
                inline
                passages={evidenceBadgeItems(paragraph.passages)}
              />
            </blockquote>
          </div>
        </div>
        {activeKeys.length > 0 && (
          <aside
            id={id}
            aria-label="Report evidence for selected passage or paragraph"
            className="min-w-0 self-start border-t border-border pt-3 min-[640px]:sticky min-[640px]:top-20 min-[640px]:max-h-[70vh] min-[640px]:overflow-y-auto min-[640px]:border-t-0 min-[640px]:border-l min-[640px]:pt-0 min-[640px]:pl-3"
            data-evidence-column
          >
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                aria-label="Close report evidence"
                onClick={() => setActiveKeys([])}
                className="cursor-pointer rounded-sm p-1 text-muted-foreground hover:text-un-blue-text focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              {reportPassages.map((passage) => (
                <ReportPassage
                  key={`${passage.id}:${activeKeys.join('|')}`}
                  passage={passage}
                  evidence={evidence}
                  components={activeKeys}
                />
              ))}
            </div>
          </aside>
        )}
      </div>
    </article>
  )
}

function ReportPassage({
  passage,
  evidence,
  components,
}: {
  passage: EvidencePassage
  evidence: ImplementationEvidenceCase
  components: string[]
}) {
  const [showFullParagraph, setShowFullParagraph] = useState(false)
  const selected = selectReportEvidence(passage, components)
  const badges = selected.excerpts.map((excerpt) => ({
    id: `${passage.id}:${excerpt.kind}`,
    kind: excerpt.kind,
  }))
  const resultLevels = [
    ...new Set(
      selected.excerpts
        .map((excerpt) => excerpt.resultLevel)
        .filter((level) => level !== null)
    ),
  ]
  const textId = useId()
  const pdfPages = [
    ...new Set(
      selected.excerpts.flatMap((excerpt) => {
        const start = excerpt.pdfPage ?? passage.pdfPage
        return Array.from(
          { length: (excerpt.pdfPageEnd ?? start) - start + 1 },
          (_, index) => start + index
        )
      })
    ),
  ].sort((a, b) => a - b)
  return (
    <article
      className="flex min-w-0 items-start gap-2 rounded-lg bg-muted p-3"
      data-report-passage={passage.number}
    >
      <span className="shrink-0 [&>span]:bg-muted-foreground">
        <ParagraphNumberBadge>{passage.number}</ParagraphNumberBadge>
      </span>
      <blockquote className="min-w-0 flex-1 text-sm leading-relaxed">
        <span id={textId} data-report-excerpt>
          {showFullParagraph ? passage.text : selected.text}
        </span>{' '}
        <EvidenceBadges inline passages={badges} />
        {selected.isExcerpt && (
          <button
            type="button"
            aria-controls={textId}
            aria-expanded={showFullParagraph}
            onClick={() => setShowFullParagraph((shown) => !shown)}
            className="ml-2 cursor-pointer rounded-sm text-xs text-un-blue-text hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {showFullParagraph
              ? 'Show relevant excerpt'
              : 'Show full paragraph'}
          </button>
        )}
      </blockquote>
      <DisclosurePopover
        label={`About ${evidence.report.symbol} paragraph ${passage.number}`}
        trigger={<Info aria-hidden className="h-4 w-4" />}
        triggerClassName="mt-0.5 shrink-0 cursor-pointer rounded-full text-muted-foreground hover:text-un-blue-text focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        contentClassName="max-w-sm"
        interactive
        align="end"
      >
        <div className="space-y-3 text-sm">
          <p className="font-medium">
            {evidence.report.symbol} · Paragraph {passage.number}
          </p>
          <p>Issued {evidence.report.issuedDate}</p>
          <EvidenceBadges passages={badges} />
          {resultLevels.map((level) => (
            <p key={level}>
              {level === 'output' ? 'Reported output' : 'Reported indicator'}
            </p>
          ))}
          <p>
            Badges describe the selected excerpts. Ellipses mark omitted text;
            expand for the full paragraph.
          </p>
          {pdfPages.map((page) => (
            <a
              key={page}
              href={reportEvidencePdfUrl(evidence.report.symbol, page)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-un-blue-text hover:underline"
            >
              Open PDF page {page}
              <ExternalLink aria-hidden className="h-3 w-3" />
            </a>
          ))}
          {passage.mappings
            .filter((mapping) => components.includes(mapping.component))
            .map((mapping, index) => (
              <div key={index} className="space-y-1">
                <p>{mapping.interpretation}</p>
                <p className="text-xs text-muted-foreground">
                  Match basis: {mapping.basis}.
                </p>
              </div>
            ))}
          <p className="text-xs text-muted-foreground">
            Reviewed {evidence.reviewedAt}. Extracted text; consult the PDF for
            footnotes and original layout.
          </p>
        </div>
      </DisclosurePopover>
    </article>
  )
}
