/**
 * Paragraph Database Queries
 *
 * Fetches paragraph-level fulltext content from the authoritative Digital
 * Library semantic layer. Only successful English parses are eligible. Scalar, deterministic
 * action-verb/assignee classifications are reassembled into the markup grammar
 * consumed by the UI (see synthesizeDlAnnotations).
 *
 * The legacy mandates.paragraphs corpus is deliberately not consulted: mixing
 * two parsers made document structure, counts and annotations depend on which
 * corpus happened to have a row for a symbol.
 *
 * The Digital Library query matches on the
 * whitespace/upper-case normalized symbol, the same join semantics the rest of
 * the app uses (see unified_documents).
 *
 * All operations are server-side only.
 */

import { cache } from 'react'
import { hasFulltextQualityWarning } from '../fulltext-quality'
import { queryMany } from '../db/query'
import type { Paragraph } from '@/types'
import { parseBracketPart, isolateBracketPart } from '../paragraph-presentation'

// ============================================================================
// Types for DB Rows (internal)
// ============================================================================

interface ParagraphRow {
  extraction_issues: unknown
  id: string
  position: number
  text: string
  type: string
  heading_level: number | null
  paragraph_type: string | null
  paragraph_level: number | null
  prefix: string | null
  text_with_highlights: string | null
  uncertainties: string | null
  /** Raw JSONB — pg parses this automatically */
  mandates: Paragraph['mandates'] | null
  /** json_agg result — pg parses this automatically */
  links: [string, string][] | null
  /** Digital Library structural metadata. */
  section: string | null
  annex_index: number | null
  text_index: number | null
  subtype: string | null
  parser_version: string | null
  /**
   * Digital Library deterministic scalar action annotations.
   */
  lead_verb?: string | null
  action_verb?: string | null
  action_verb_normalized?: string | null
  action_category?: string | null
  assignee?: string | null
  assignee_head_noun?: string | null
  assignee_class?: string | null
}

type ParagraphMandate = NonNullable<Paragraph['mandates']>[number]

/**
 * Delimiters of the highlight markup grammar consumed by ParagraphsSection:
 * `*verb*`, `<<assignee>>`, `{{mentioned entity}}`, `[[deliverable]]`. A
 * paragraph whose raw text already contains any of them cannot be marked up
 * unambiguously (the renderer's non-greedy regexes would pair the wrong
 * characters), so it is left un-highlighted. Affects ~49 of 508,923 DL rows.
 */
const HIGHLIGHT_DELIMITERS = ['*', '<<', '>>', '{{', '}}', '[[', ']]']

function containsHighlightDelimiter(text: string): boolean {
  return HIGHLIGHT_DELIMITERS.some((d) => text.includes(d))
}

/**
 * Rebuild the `text_with_highlights` markup and the `mandates` object for a
 * Digital Library paragraph from its scalar annotation columns.
 *
 * The DL layer stores no character offsets, but the spans are recoverable:
 * `lead_verb` is by construction the literal opening span of `text`
 * (508,718/508,923 = 99.96% of annotated rows satisfy `text.startsWith`), and
 * `assignee` is a literal substring (114,318/114,335 = 99.99% of rows that have
 * both). Both are verified per row before use — a mismatch drops that span
 * rather than mis-wrapping it.
 *
 * `mandates[0].action_verb` is deliberately the raw `lead_verb` (not the
 * canonical `action_verb`), because ParagraphsSection resolves the verb tooltip
 * by string-equality against the text it found between the asterisks.
 *
 * Returns `null` when the row carries no canonical verb annotation at all.
 * `textWithHighlights` is `undefined` when no span could be wrapped (e.g.
 * `action_inherited` rows, which have an `action_verb` but no `lead_verb`);
 * such rows still get a `mandates` entry so the filters can see them.
 */
function synthesizeDlAnnotations(
  row: ParagraphRow
): Pick<Paragraph, 'textWithHighlights' | 'mandates'> | null {
  const canonicalVerb = row.action_verb ?? null
  if (!canonicalVerb) return null

  const text = row.text
  const leadVerb = row.lead_verb ?? null
  const assignee = row.assignee ?? null

  // Offsets first, markup second: inserting a delimiter shifts every later
  // offset, so both spans are located against the pristine text and then
  // spliced in descending order.
  const canMarkUp = !containsHighlightDelimiter(text)

  const verbStart = canMarkUp && leadVerb && text.startsWith(leadVerb) ? 0 : -1
  const verbEnd = verbStart === 0 && leadVerb ? leadVerb.length : -1

  let assigneeStart = -1
  if (canMarkUp && assignee) {
    // Search past the verb span so the two can never overlap.
    const from = verbEnd > 0 ? verbEnd : 0
    assigneeStart = text.indexOf(assignee, from)
  }
  const assigneeEnd =
    assigneeStart >= 0 && assignee ? assigneeStart + assignee.length : -1

  let marked = text
  if (assigneeStart >= 0) {
    marked =
      marked.slice(0, assigneeStart) +
      `<<${marked.slice(assigneeStart, assigneeEnd)}>>` +
      marked.slice(assigneeEnd)
  }
  if (verbStart === 0) {
    marked = `*${marked.slice(0, verbEnd)}*` + marked.slice(verbEnd)
  }

  const wrappedVerb = verbStart === 0 && leadVerb ? leadVerb : null
  const wrappedAssignee =
    assigneeStart >= 0 && assignee
      ? text.slice(assigneeStart, assigneeEnd)
      : null

  const mandate: ParagraphMandate = {
    // Must equal what sits between the asterisks for the tooltip lookup to hit.
    action_verb: wrappedVerb ?? canonicalVerb,
    action_verb_normalized: row.action_verb_normalized ?? undefined,
    action_verb_type: row.action_category ?? 'unclear',
    assignees: wrappedAssignee
      ? [
          {
            assignee: wrappedAssignee,
            assignee_normalized: row.assignee_head_noun ?? wrappedAssignee,
            assignee_type: row.assignee_class ?? 'unclear',
          },
        ]
      : [],
    // The Digital Library layer has no columns for either.
    mentioned_entities: [],
    deliverables: [],
  }

  return {
    textWithHighlights: marked === text ? undefined : marked,
    mandates: [mandate],
  }
}

function mapRow(row: ParagraphRow): Paragraph {
  return {
    extraction_quality_warning: hasFulltextQualityWarning(row.extraction_issues),
    id: row.id,
    position: row.position,
    text: row.text,
    type: row.type,
    heading_level: row.heading_level,
    paragraph_type: row.paragraph_type,
    paragraph_level: row.paragraph_level,
    prefix: row.prefix,
    links: row.links ?? [],
    textWithHighlights: row.text_with_highlights ?? undefined,
    uncertainties: row.uncertainties ?? undefined,
    mandates: row.mandates ?? undefined,
    section: row.section ?? undefined,
    annex_index: row.annex_index ?? undefined,
    text_index: row.text_index ?? undefined,
    subtype: row.subtype ?? undefined,
    parser_version: row.parser_version ?? undefined,
    source: 'digitallibrary',
  }
}

function mapDlRow(row: ParagraphRow): Paragraph {
  const base = mapRow(row)
  const annotations = synthesizeDlAnnotations(row)
  return annotations ? { ...base, ...annotations } : base
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch all paragraphs for a document in order, with their links.
 *
 * Only successful parses are readable. Failed or unfinished processing must
 * not expose old semantic rows from a previous parse.
 */
const getDirectParagraphsBySymbol = cache(
  async (documentSymbol: string): Promise<Paragraph[]> => {
    const normalizedSymbol = documentSymbol.replace(/\s/g, '').toUpperCase()
    // digitallibrary.document_paragraphs (semantic fulltext).
    // Indexed on (symbol_normalized, lang). Match the app-wide normalized symbol
    // join (upper + strip whitespace). Masthead frontmatter is dropped as pure
    // document boilerplate; every other DL `type` is carried through verbatim
    // so neutral adopted-instrument and annex body content remains visible.
    const dlRows = await queryMany<ParagraphRow>(
      `
      /* trace:paragraphs.digital-library */
      SELECT
        dp.id,
        dp.position,
        dp.text,
        dp.type,
        dp.heading_level,
        dp.paragraph_type,
        dp.level AS paragraph_level,
        dp.prefix,
        NULL::text AS text_with_highlights,
        NULL::text AS uncertainties,
        NULL::jsonb AS mandates,
        COALESCE(
          (
            SELECT json_agg(json_build_array(h->>'text', h->>'url'))
            FROM jsonb_array_elements(dp.hyperlinks) h
          ),
          '[]'::json
        ) AS links,
        dp.section,
        dp.annex_index,
        dp.text_index,
        dp.subtype,
        parses.parser_version,
        parses.issues AS extraction_issues,
        dp.lead_verb,
        dp.action_verb,
        dp.action_verb_normalized,
        dp.action_category,
        dp.assignee,
        dp.assignee_head_noun,
        dp.assignee_class
      FROM digitallibrary.document_paragraphs dp
      JOIN digitallibrary.document_files files
        ON files.symbol_normalized = dp.symbol_normalized
       AND files.lang = dp.lang
       AND files.status = 'parsed'
      JOIN digitallibrary.document_parses parses
        ON parses.symbol_normalized = dp.symbol_normalized
       AND parses.lang = dp.lang
      WHERE dp.symbol_normalized = ANY($1::text[])
        AND dp.lang = 'en'
        AND NOT (dp.type = 'frontmatter' AND dp.subtype IS NOT DISTINCT FROM 'masthead')
      ORDER BY dp.position
      `,
      [[normalizedSymbol]]
    )

    return dlRows.map(mapDlRow)
  }
)

/** Resolve exact, unambiguous lettered blocks from successfully parsed parents.
 * Complex bracket expressions deliberately remain unavailable: whole-parent text
 * must not silently stand in for the requested part. No legacy corpus fallback.
 */
export const getParagraphsBySymbol = cache(
  async (documentSymbol: string): Promise<Paragraph[]> => {
    const direct = await getDirectParagraphsBySymbol(documentSymbol)
    if (direct.length > 0) return direct
    const part = parseBracketPart(documentSymbol)
    if (!part) return []
    const parent = await getDirectParagraphsBySymbol(part.parentSymbol)
    return isolateBracketPart(parent, part.letter).map((paragraph) => ({
      ...paragraph,
      source_symbol: part.parentSymbol,
      part_letter: part.letter,
    }))
  }
)
