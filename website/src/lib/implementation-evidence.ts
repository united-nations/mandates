/** Reviewed passage relationships; counts are not completion scores. */
export const EVIDENCE_KINDS = {
  activity: 'Reported activity',
  results: 'Reported results',
  analysis: 'Analysis delivered',
  context: 'Context / gaps',
  recommendation: 'Proposed next steps',
  reporting: 'Reporting mandate',
} as const

export const EVIDENCE_BADGE_LABELS: Record<EvidenceKind, string> = {
  activity: 'Activity',
  results: 'Results',
  analysis: 'Analysis',
  context: 'Context / gaps',
  recommendation: 'Next steps',
  reporting: 'Reporting',
}

export type EvidenceKind = keyof typeof EVIDENCE_KINDS

export interface EvidenceExcerpt {
  text: string
  kind: EvidenceKind
  resultLevel: 'output' | 'indicator' | null
  pdfPage?: number
  pdfPageEnd?: number
}

export interface EvidencePassage {
  id: string
  number: number
  text: string
  pdfPage: number
  kind: EvidenceKind
  resultLevel: 'output' | 'indicator' | null
  mappings: {
    component: string
    basis: string
    interpretation: string
    excerpts?: EvidenceExcerpt[]
  }[]
}

/** Use only exact, unique reviewed excerpts; otherwise retain the complete source. */
export function selectReportEvidence(
  passage: EvidencePassage,
  components: readonly string[]
) {
  const mappings = passage.mappings.filter((m) =>
    components.includes(m.component)
  )
  const excerpts = mappings.flatMap((m) => m.excerpts ?? [])
  const valid =
    mappings.length > 0 &&
    mappings.every((m) => m.excerpts?.length) &&
    excerpts.every(
      (excerpt) =>
        excerpt.text.length > 0 && passage.text.split(excerpt.text).length === 2
    )
  if (!valid)
    return {
      text: passage.text,
      isExcerpt: false,
      excerpts: [
        {
          text: passage.text,
          kind: passage.kind,
          resultLevel: passage.resultLevel,
          pdfPage: passage.pdfPage,
        },
      ],
    }

  const ranges = excerpts
    .map((excerpt) => {
      const start = passage.text.indexOf(excerpt.text)
      return { start, end: start + excerpt.text.length }
    })
    .sort((a, b) => a.start - b.start)
  const merged: { start: number; end: number }[] = []
  for (const range of ranges) {
    const previous = merged.at(-1)
    if (
      previous &&
      passage.text.slice(previous.end, range.start).trim() === ''
    ) {
      previous.end = Math.max(previous.end, range.end)
    } else if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end)
    } else merged.push({ ...range })
  }
  const text =
    (merged[0].start > 0 ? '… ' : '') +
    merged
      .map((range) => passage.text.slice(range.start, range.end))
      .join(' … ') +
    (merged.at(-1)!.end < passage.text.length ? ' …' : '')
  return { text, isExcerpt: text !== passage.text, excerpts }
}

/** Badges describe reviewed excerpts, including mixed information in one paragraph. */
export function evidenceBadgeItems(passages: readonly EvidencePassage[]) {
  return passages.flatMap((passage) => {
    const selected = selectReportEvidence(
      passage,
      passage.mappings.map((m) => m.component)
    )
    return selected.excerpts.map((excerpt) => ({
      id: `${passage.id}:${excerpt.kind}`,
      kind: excerpt.kind,
    }))
  })
}

export interface ParagraphEvidence {
  locator: {
    section: string
    annexIndex: number | null
    prefix: string
    position?: number
  }
  label: string
  parentParagraph?: number
  requestedText: string
  passages: EvidencePassage[]
  review: {
    status: 'matched' | 'no-match'
    note: string
  }
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
  position?: number
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
      item.locator.prefix === (paragraph.prefix ?? '') &&
      (item.locator.position === undefined ||
        item.locator.position === paragraph.position) &&
      normalize(item.requestedText) === normalize(paragraph.text)
  )
}

/** One report paragraph can address multiple components; count it only once. */
export function summarizeEvidence(
  passages: readonly Pick<EvidencePassage, 'id' | 'kind'>[]
) {
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
  return `evidence-${paragraph.locator.section}-${paragraph.locator.annexIndex ?? 0}-${paragraph.locator.prefix.replace(/\W/g, '')}${paragraph.locator.position === undefined ? '' : `-position-${paragraph.locator.position}`}`
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
  return splitEvidenceQuotes(text, quote ? [quote] : [])
}

/** Merge overlapping reviewed spans so highlighting never repeats source text. */
export function splitEvidenceQuotes(text: string, quotes: readonly string[]) {
  const ranges = [...new Set(quotes)]
    .flatMap((quote) => {
      const start = quote ? text.indexOf(quote) : -1
      return start < 0 || text.indexOf(quote, start + 1) >= 0
        ? []
        : [{ start, end: start + quote.length }]
    })
    .sort((a, b) => a.start - b.start)
  const merged: { start: number; end: number }[] = []
  for (const range of ranges) {
    const previous = merged[merged.length - 1]
    if (previous && range.start <= previous.end)
      previous.end = Math.max(previous.end, range.end)
    else merged.push({ ...range })
  }
  const parts: { text: string; highlighted: boolean }[] = []
  let position = 0
  for (const range of merged) {
    if (position < range.start)
      parts.push({
        text: text.slice(position, range.start),
        highlighted: false,
      })
    parts.push({ text: text.slice(range.start, range.end), highlighted: true })
    position = range.end
  }
  if (position < text.length)
    parts.push({ text: text.slice(position), highlighted: false })
  return parts
}

/** Keep every mapping on overlaps, so a shared clause opens all relevant evidence. */
export function evidenceNavigationParts(
  text: string,
  targets: readonly { key: string; quote?: string }[]
) {
  const ranges = targets.flatMap(({ key, quote }) => {
    // Paragraph-wide relationships use a separate control, leaving prose plain.
    if (!quote || quote === text) return []
    const start = text.indexOf(quote)
    return start < 0 || text.indexOf(quote, start + 1) >= 0
      ? []
      : [{ key, start, end: start + quote.length }]
  })
  const boundaries = [
    ...new Set([
      0,
      text.length,
      ...ranges.flatMap((range) => [range.start, range.end]),
    ]),
  ].sort((a, b) => a - b)
  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1]
    return {
      text: text.slice(start, end),
      keys: ranges
        .filter((range) => range.start <= start && range.end >= end)
        .map((range) => range.key),
    }
  })
}

export function reportEvidencePdfUrl(symbol: string, page: number): string {
  if (!Number.isInteger(page) || page < 1) throw new Error('Invalid PDF page')
  return `https://documents.un.org/api/symbol/access?s=${encodeURIComponent(symbol)}&l=en&t=pdf#page=${page}`
}
