'use client'

import {
  EVIDENCE_KINDS,
  evidenceAnchor,
  implementationAnchor,
  summarizeEvidence,
  type EvidencePassage,
  type ParagraphEvidence,
} from '@/lib/implementation-evidence'

export function EvidenceBreakdown({
  passages,
}: {
  passages: readonly EvidencePassage[]
}) {
  const { counts } = summarizeEvidence(passages)
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {(Object.keys(EVIDENCE_KINDS) as (keyof typeof EVIDENCE_KINDS)[])
        .filter(
          (kind) =>
            kind === 'activity' || kind === 'results' || counts[kind] > 0
        )
        .map((kind) => (
          <span key={kind}>
            {EVIDENCE_KINDS[kind]}: {counts[kind]}
          </span>
        ))}
    </span>
  )
}

/** Keep the fulltext signpost; the evidence itself lives in the section above. */
export function ParagraphImplementationEvidence({
  paragraph,
}: {
  paragraph: ParagraphEvidence
}) {
  const { total } = summarizeEvidence(paragraph.passages)
  return (
    <div
      id={evidenceAnchor(paragraph)}
      className="mt-3 scroll-mt-28 space-y-1 border-t border-border pt-3"
    >
      <a
        href={`#${implementationAnchor(paragraph)}`}
        className="text-sm font-medium text-un-blue-text hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {total} matching report passage{total === 1 ? '' : 's'} — view breakdown
      </a>
      <EvidenceBreakdown passages={paragraph.passages} />
    </div>
  )
}
