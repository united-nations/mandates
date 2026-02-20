/**
 * PPB-specific helpers: citation details and cross-citations.
 * List queries, counts, and getMandateBySymbol have moved to unified.ts.
 */

import { queryMany } from '../db/query'
import type { CrossCitation } from '@/types'

/** Row type for citation query results */
interface CitationQueryRow {
  origin_document: string | null
  budget_part: string | null
  section: string | null
  section_title: string | null
  entity: string | null
  programme: number | null
  programme_title: string | null
  sub_programme: string | null
  component: string | null
  part_in_document: string | null
  entity_long: string | null
}

interface EntityCountRow {
  entity: string
  entity_long: string | null
  count: string
}

/**
 * Fetch detailed citation info for a specific mandate (used on detail pages).
 */
export async function getMandateCitations(symbol: string): Promise<
  {
    origin_document: string
    budget_part: string
    section: string
    section_title: string
    entity_long: string
    entity: string
    programme: number | null
    programme_title: string
    'sub-programme': string | null
    component: string | number | null
    description: string
    part_in_document: string
  }[]
> {
  const query = `
    SELECT
      c.origin_document,
      c.budget_part,
      c.section,
      c.section_title,
      c.entity,
      c.programme,
      c.programme_title,
      c.sub_programme,
      c.component,
      c.part_in_document,
      e.entity_long
    FROM ppb2026.source_document_citations c
    LEFT JOIN systemchart.entities e ON c.entity = e.entity
    WHERE c.ppb_full_document_symbol = $1
    ORDER BY c.entity, c.programme
  `

  const rows = await queryMany<CitationQueryRow>(query, [symbol])

  return rows.map((row) => ({
    origin_document: row.origin_document || '',
    budget_part: row.budget_part || '',
    section: row.section || '',
    section_title: row.section_title || '',
    entity_long: row.entity_long || row.entity || '',
    entity: row.entity || '',
    programme: row.programme,
    programme_title: row.programme_title || '',
    'sub-programme': row.sub_programme || null,
    component: row.component || null,
    description: '',
    part_in_document: row.part_in_document || '',
  }))
}

/**
 * Get cross-citations for entity pages (other entities that cite the same documents).
 */
export async function getCrossCitations(entityCode: string): Promise<CrossCitation[]> {
  const query = `
    WITH entity_docs AS (
      SELECT DISTINCT ppb_full_document_symbol
      FROM ppb2026.source_document_citations
      WHERE entity = $1
    )
    SELECT
      c.entity,
      e.entity_long,
      COUNT(DISTINCT c.ppb_full_document_symbol) AS count
    FROM entity_docs ed
    JOIN ppb2026.source_document_citations c
      ON ed.ppb_full_document_symbol = c.ppb_full_document_symbol
    LEFT JOIN systemchart.entities e ON c.entity = e.entity
    WHERE c.entity IS NOT NULL
      AND c.entity != ''
      AND c.entity != $1
    GROUP BY c.entity, e.entity_long
    ORDER BY count DESC
  `

  const rows = await queryMany<EntityCountRow>(query, [entityCode])

  return rows.map((row) => ({
    entity: row.entity,
    entity_long: row.entity_long || row.entity,
    count: parseInt(row.count) || 0,
  }))
}
