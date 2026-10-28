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
  components?: {
    key: string
    title: string
    summary: string
    quote: string
  }[]
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

export function implementationAnchor(paragraph: ParagraphEvidence): string {
  return `implementation-${evidenceAnchor(paragraph)}`
}

/** Group by the reviewed action/component, keeping each source passage once per group. */
export function groupParagraphEvidence(paragraph: ParagraphEvidence) {
  const keys = [
    ...new Set([
      ...(paragraph.components ?? []).map((component) => component.key),
      ...paragraph.passages.flatMap((passage) =>
        passage.mappings.map((mapping) => mapping.component)
      ),
    ]),
  ]
  return keys.flatMap((key) => {
    const passages = [
      ...new Map(
        paragraph.passages
          .filter((passage) =>
            passage.mappings.some((mapping) => mapping.component === key)
          )
          .map((passage) => [passage.id, passage])
      ).values(),
    ]
    if (passages.length === 0) return []
    const component = paragraph.components?.find((item) => item.key === key)
    const mapping = passages[0].mappings.find((item) => item.component === key)!
    return [
      {
        key,
        title:
          component?.title ??
          (key.includes(':')
            ? key.slice(key.indexOf(':') + 1).trim()
            : 'What the report says'),
        summary: component?.summary ?? mapping.interpretation,
        quote: component?.quote,
        passages,
      },
    ]
  })
}

/** An exact, unambiguous source span; never highlight a guessed or partial match. */
export function splitEvidenceQuote(text: string, quote?: string) {
  const start = quote ? text.indexOf(quote) : -1
  if (!quote || start < 0 || text.indexOf(quote, start + 1) >= 0) {
    return [{ text, highlighted: false }]
  }
  return [
    { text: text.slice(0, start), highlighted: false },
    { text: quote, highlighted: true },
    { text: text.slice(start + quote.length), highlighted: false },
  ]
}

export function reportEvidencePdfUrl(symbol: string, page: number): string {
  if (!Number.isInteger(page) || page < 1) throw new Error('Invalid PDF page')
  return `https://documents.un.org/api/symbol/access?s=${encodeURIComponent(symbol)}&l=en&t=pdf#page=${page}`
}
