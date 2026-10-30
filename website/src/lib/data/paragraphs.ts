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
import { synthesizeDlAnnotations } from '../fulltext-annotations'
import { hasFulltextQualityWarning } from '../fulltext-quality'
import { queryMany } from '../db/query'
import type { Paragraph } from '@/types'
import { parseBracketPart, isolateBracketPart } from '../paragraph-presentation'

// ============================================================================
// Types for DB Rows (internal)
// ============================================================================

interface ParagraphRow {
  note_references: Paragraph['note_references'] | null
  note_ids: number[] | null
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
  action_inherited?: boolean | null
  lead_verb?: string | null
  action_verb?: string | null
  action_verb_normalized?: string | null
  action_category?: string | null
  assignee?: string | null
  assignee_head_noun?: string | null
  assignee_class?: string | null
}

function mapRow(row: ParagraphRow): Paragraph {
  return {
    extraction_quality_warning: hasFulltextQualityWarning(row.extraction_issues),
    id: row.id,
    position: row.position,
    note_ids: row.note_ids ?? [],
    note_references: row.note_references ?? [],
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
const getDirectParagraphsBySymbols = cache(
  async (documentSymbols: string[]): Promise<Map<string, Paragraph[]>> => {
    const normalizedSymbols = documentSymbols.map(symbol => symbol.replace(/\s/g, '').toUpperCase())
    // digitallibrary.document_paragraphs (semantic fulltext).
    // Indexed on (symbol_normalized, lang). Match the app-wide normalized symbol
    // join (upper + strip whitespace). Masthead frontmatter is dropped as pure
    // document boilerplate; every other DL `type` is carried through verbatim
    // so neutral adopted-instrument and annex body content remains visible.
    const dlRows = await queryMany<ParagraphRow & { symbol_normalized: string }>(
      `
      /* trace:paragraphs.digital-library */
      SELECT
        dp.symbol_normalized,
        dp.id,
        dp.position,
        dp.note_ids,
        dp.note_references,
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
        dp.action_inherited,
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
      [normalizedSymbols]
    )

    return new Map(documentSymbols.map(symbol => [symbol, dlRows.filter(row => row.symbol_normalized === symbol.replace(/\s/g, '').toUpperCase()).map(mapDlRow)]))
  }
)

/** Resolve exact, unambiguous lettered blocks from successfully parsed parents.
 * Complex bracket expressions deliberately remain unavailable: whole-parent text
 * must not silently stand in for the requested part. No legacy corpus fallback.
 */
export async function getParagraphsBySymbols(symbols: string[]): Promise<Map<string, Paragraph[]>> {
  const requested = [...new Set([...symbols, ...symbols.flatMap(symbol => {
    const part = parseBracketPart(symbol)
    return part ? [part.parentSymbol] : []
  })])]
  const direct = await getDirectParagraphsBySymbols(requested)
  return new Map(symbols.map(symbol => {
    const rows = direct.get(symbol) ?? []
    if (rows.length) return [symbol, rows]
    const part = parseBracketPart(symbol)
    return [symbol, part ? isolateBracketPart(direct.get(part.parentSymbol) ?? [], part.letter).map(paragraph => ({
      ...paragraph, source_symbol: part.parentSymbol, part_letter: part.letter,
    })) : []]
  }))
}
export const getParagraphsBySymbol = cache(async (symbol: string): Promise<Paragraph[]> =>
  (await getParagraphsBySymbols([symbol])).get(symbol) ?? []
)
