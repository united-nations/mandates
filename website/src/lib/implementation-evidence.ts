/** Reviewed passage relationships; counts are not completion scores. */
export const EVIDENCE_KINDS = {
  activity: 'Reported activity',
  results: 'Reported results',
  analysis: 'Analysis delivered',
  context: 'Context / gaps',
  recommendation: 'Proposed next steps',
  reporting: 'Reporting mandate',
} as const

export type EvidenceKind = keyof typeof EVIDENCE_KINDS

export interface EvidencePassage {
  id: string
  number: number
  text: string
  pdfPage: number
  kind: EvidenceKind
  resultLevel: 'output' | 'indicator' | null
  mappings: { component: string; basis: string; interpretation: string }[]
}

export interface ParagraphEvidence {
  locator: { section: string; annexIndex: number | null; prefix: string }
  label: string
  requestedText: string
  passages: EvidencePassage[]
}

export interface ImplementationEvidenceCase {
  symbol: string
  title: string
  reviewedAt: string
  report: { symbol: string; title: string; issuedDate: string; sha256: string }
  paragraphs: ParagraphEvidence[]
}

interface SourceParagraph {
  section?: string
  annex_index?: number | null
  prefix: string | null
  text: string
}

export function normalizeEvidenceSymbol(symbol: string): string {
  return symbol.replace(/\s/g, '').toUpperCase()
}

/** Reviewed mappings fail closed when the source or its structural scope changes. */
export function matchParagraphEvidence(
  evidence: ImplementationEvidenceCase | null | undefined,
  paragraph: SourceParagraph
): ParagraphEvidence | undefined {
  const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()
  return evidence?.paragraphs.find(
    (item) =>
      item.locator.section === paragraph.section &&
      item.locator.annexIndex === (paragraph.annex_index ?? null) &&
      item.locator.prefix === paragraph.prefix &&
      normalize(item.requestedText) === normalize(paragraph.text)
  )
}

/** One report paragraph can address multiple components; count it only once. */
export function summarizeEvidence(passages: readonly EvidencePassage[]) {
  const unique = [...new Map(passages.map((p) => [p.id, p])).values()]
  const counts = Object.fromEntries(
    Object.keys(EVIDENCE_KINDS).map((kind) => [
      kind,
      unique.filter((passage) => passage.kind === kind).length,
    ])
  ) as Record<EvidenceKind, number>
  return { total: unique.length, counts }
}

export function evidenceAnchor(paragraph: ParagraphEvidence): string {
  return `evidence-${paragraph.locator.section}-${paragraph.locator.annexIndex ?? 0}-${paragraph.locator.prefix.replace(/\W/g, '')}`
}

export function reportEvidencePdfUrl(symbol: string, page: number): string {
  if (!Number.isInteger(page) || page < 1) throw new Error('Invalid PDF page')
  return `https://documents.un.org/api/symbol/access?s=${encodeURIComponent(symbol)}&l=en&t=pdf#page=${page}`
}
