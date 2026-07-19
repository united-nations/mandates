/**
 * Paragraph Database Queries
 *
 * Fetches paragraph-level fulltext content for a document. Two corpora back this:
 *
 *   1. mandates.paragraphs — the richer, mandate-NER-tagged corpus (~2.8k
 *      PPB-cited docs), with linked-symbol pairs and per-paragraph mandate
 *      objects. This wins whenever it covers the symbol.
 *   2. digitallibrary.document_paragraphs — the semantic fulltext layer for UN
 *      resolutions/PRSTs (lang='en'). Fills in every other document, mapped into
 *      the same return contract (mandates/highlights/uncertainties are NULL).
 *
 * This mirrors public.unified_paragraphs (sql/migrations/029), but is expressed
 * as two per-symbol, index-driven queries with fallback rather than a single
 * SELECT against the view: the view's precedence anti-join full-scans
 * mandates.paragraphs (~120ms), whereas running the mandates arm first and the
 * Digital Library arm only when it returns nothing keeps every lookup on a
 * symbol index (idx_paragraphs_symbol / idx_document_paragraphs_symbol, <10ms)
 * and reproduces the same precedence. The Digital Library arm matches on the
 * whitespace/upper-case normalized symbol, the same join semantics the rest of
 * the app uses (see unified_documents).
 *
 * All operations are server-side only.
 */

import { cache } from 'react'
import { queryMany } from '../db/query'
import type { Paragraph } from '@/types'

// ============================================================================
// Types for DB Rows (internal)
// ============================================================================

interface ParagraphRow {
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
  /** DL-only structural metadata; NULL for the mandates arm. */
  section: string | null
  annex_index: number | null
  text_index: number | null
}

function mapRow(row: ParagraphRow): Paragraph {
  return {
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
  }
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch all paragraphs for a document in order, with their links.
 *
 * Precedence: the mandates.paragraphs arm wins; the Digital Library arm is
 * consulted only when the mandates arm returns nothing. Returns an empty array
 * when no fulltext has been extracted for the symbol in either corpus.
 */
export const getParagraphsBySymbol = cache(
  async (documentSymbol: string): Promise<Paragraph[]> => {
    // Arm 1 — mandates.paragraphs (richer). Indexed on document_symbol.
    const mandatesRows = await queryMany<ParagraphRow>(
      `
      SELECT
        p.id,
        p.position,
        p.text,
        p.type,
        p.heading_level,
        p.paragraph_type,
        p.paragraph_level,
        p.prefix,
        p.text_with_highlights,
        p.uncertainties,
        p.mandates,
        COALESCE(
          json_agg(
            json_build_array(pl.linked_symbol, pl.linked_url)
            ORDER BY pl.id
          ) FILTER (WHERE pl.id IS NOT NULL),
          '[]'::json
        ) AS links,
        NULL::text AS section,
        NULL::smallint AS annex_index,
        NULL::smallint AS text_index
      FROM mandates.paragraphs p
      LEFT JOIN mandates.paragraph_links pl ON pl.paragraph_id = p.id
      WHERE p.document_symbol = $1
      GROUP BY
        p.id, p.position, p.text, p.type,
        p.heading_level, p.paragraph_type, p.paragraph_level,
        p.prefix, p.text_with_highlights, p.uncertainties, p.mandates
      ORDER BY p.position
      `,
      [documentSymbol]
    )

    if (mandatesRows.length > 0) {
      return mandatesRows.map(mapRow)
    }

    // Arm 2 — digitallibrary.document_paragraphs (semantic fulltext).
    // Indexed on (symbol_normalized, lang). Match the app-wide normalized symbol
    // join (upper + strip whitespace). Masthead frontmatter is dropped as pure
    // document boilerplate; every other DL `type` is carried through verbatim —
    // ParagraphsSection only special-cases 'heading' and renders
    // operative/preambular clauses, hiding all other elements under its
    // permanent operative filter, so the mapping is render-safe as-is.
    const dlRows = await queryMany<ParagraphRow>(
      `
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
        dp.text_index
      FROM digitallibrary.document_paragraphs dp
      WHERE dp.symbol_normalized = upper(regexp_replace($1, '[[:space:]]', '', 'g'))
        AND dp.lang = 'en'
        AND NOT (dp.type = 'frontmatter' AND dp.subtype = 'masthead')
      ORDER BY dp.position
      `,
      [documentSymbol]
    )

    return dlRows.map(mapRow)
  }
)
