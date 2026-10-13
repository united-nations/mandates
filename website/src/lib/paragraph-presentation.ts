/** Pure fulltext visibility rules shared by rendering and conservation checks. */
export interface PresentationElement {
  type: string
  text: string
  section?: string
  subtype?: string | null
  paragraph_type?: string | null
}
export type VisibilityTier = 'strict' | 'frontmatter' | 'title'
const HIDDEN_TYPES = new Set([
  'frontmatter',
  'backmatter',
  'footer',
  'signature',
  'vote_record',
  'divider',
])
export function isAnnexSection(section?: string): boolean {
  return section === 'annex' || section === 'appendix'
}
export function isContentElement(
  p: PresentationElement,
  tier: VisibilityTier = 'strict'
): boolean {
  if (!p.text?.trim() || p.subtype === 'masthead') return false
  if (p.type === 'frontmatter') return tier !== 'strict'
  if (p.type === 'title') return isAnnexSection(p.section) || tier === 'title'
  return !HIDDEN_TYPES.has(p.type)
}
/** Ignore headings alone when deciding whether a document has a readable body. */
export function resolveVisibilityTier(
  paragraphs: readonly PresentationElement[]
): VisibilityTier {
  for (const tier of ['strict', 'frontmatter', 'title'] as const) {
    if (
      paragraphs.some(
        (p) =>
          p.type !== 'heading' &&
          p.type !== 'opening' &&
          isContentElement(p, tier)
      )
    )
      return tier
  }
  return 'strict'
}

export interface BracketPart {
  parentSymbol: string
  letter: string
}
/** Only resolution aliases with one printed part letter can be isolated safely. */
export function parseBracketPart(symbol: string): BracketPart | null {
  const normalized = symbol.replace(/\s/g, '').toUpperCase()
  const match = normalized.match(/^(.+\/RES\/[^\[\]]+)\[([A-Z])\]$/)
  return match ? { parentSymbol: match[1], letter: match[2] } : null
}
export interface PartElement {
  type: string
  text: string
  subtype?: string | null
  text_index?: number | null
}
/** Match printed letters, never ordinal block positions; ambiguous headings fail closed. */
export function isolateBracketPart<T extends PartElement>(
  rows: readonly T[],
  letter: string
): T[] {
  const headings = rows.filter(
    (p) => p.type === 'heading' && p.subtype === 'subres'
  )
  const matches = headings.filter((p) => p.text.trim() === letter)
  if (matches.length !== 1 || matches[0].text_index == null) return []
  const index = matches[0].text_index
  // Reused block indices cannot establish ownership of the requested part.
  if (headings.filter((p) => p.text_index === index).length !== 1) return []
  return rows.filter((p) => p.text_index === index)
}

export function isMainPreambular(p: PresentationElement): boolean {
  return (
    p.type !== 'heading' &&
    p.paragraph_type === 'preambular' &&
    !isAnnexSection(p.section)
  )
}
/** Keep preamble-only text in the main flow; search must also reach those clauses. */
export function shouldCollapsePreamble(
  rows: readonly PresentationElement[],
  searching = false
): boolean {
  if (searching) return false
  const tier = resolveVisibilityTier(rows)
  return rows.some(
    (p) =>
      p.type !== 'heading' &&
      p.type !== 'opening' &&
      !isMainPreambular(p) &&
      isContentElement(p, tier)
  )
}
