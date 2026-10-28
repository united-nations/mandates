'use client'

import { Chip } from '@/components/ui/chip'
import {
  EVIDENCE_KINDS,
  EVIDENCE_BADGE_LABELS,
  evidenceAnchor,
  implementationAnchor,
  summarizeEvidence,
  type EvidenceKind,
  type EvidencePassage,
  type ParagraphEvidence,
} from '@/lib/implementation-evidence'

export function EvidenceBadges({
  passages,
}: {
  passages: readonly EvidencePassage[]
}) {
  const { counts } = summarizeEvidence(passages)
  return (
    <span
      className="flex flex-wrap gap-1.5"
      aria-label="Available evidence types"
    >
      {(Object.keys(EVIDENCE_KINDS) as EvidenceKind[])
        .filter((kind) => counts[kind] > 0)
        .map((kind) => (
          <Chip key={kind} density="dense" title={EVIDENCE_KINDS[kind]}>
            {EVIDENCE_BADGE_LABELS[kind]}
          </Chip>
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
  return (
    <div
      id={evidenceAnchor(paragraph)}
      className="mt-3 scroll-mt-28 space-y-2 border-t border-border pt-3"
    >
      <a
        href={`#${implementationAnchor(paragraph)}`}
        className="text-sm font-medium text-un-blue-text hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Implementation evidence
      </a>
      <EvidenceBadges passages={paragraph.passages} />
    </div>
  )
}
