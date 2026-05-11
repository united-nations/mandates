/**
 * Paragraph Database Queries
 *
 * Fetches paragraph-level fulltext content from the mandates schema in PostgreSQL.
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
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch all paragraphs for a document in order, with their links.
 * Returns an empty array when no fulltext has been extracted for the symbol.
 */
export const getParagraphsBySymbol = cache(
  async (documentSymbol: string): Promise<Paragraph[]> => {
    const rows = await queryMany<ParagraphRow>(
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
        ) AS links
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

    return rows.map((row) => ({
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
    }))
  }
)
