// Data access for the /citation-matrix page. Builds the cross-citation matrix
// (entity × entity → # shared source documents) per budget version.
//
// The SQL pivots `pillar` and `budget_part` per entity (some citation rows have
// them NULL, e.g. from the Plan Outline), then joins each entity's citation set
// with itself by ppb_full_document_symbol to count overlap.

import { unstable_cache } from 'next/cache'
import { queryMany } from '../db/query'
import {
  deriveGroup,
  GROUP_ORDER,
  isExcludedEntity,
  type GroupLabel,
} from '../citation-matrix-constants'

export type VersionSlug = 'ppb2026' | 'ppb2027'

export type MatrixEntity = {
  entity: string
  group: GroupLabel
}

// cells[i][j] = # docs cited by both entities[i] and entities[j].
// Both versions share the same entity array (sorted by group, then entity name)
// so cells line up across views.
export type CitationMatrixData = {
  entities: MatrixEntity[]
  matrices: Record<VersionSlug, number[][]>
}

type Row = {
  version_slug: VersionSlug
  entity_a: string
  entity_b: string
  shared_docs: number
}

type EntityMetaRow = {
  entity: string
  pillar: string | null
  budget_part: string | null
}

export const getCitationMatrix = unstable_cache(
  async (): Promise<CitationMatrixData> => {
    const entityMeta = await queryMany<EntityMetaRow>(`
      SELECT
        entity,
        MAX(pillar)      FILTER (WHERE pillar      IS NOT NULL) AS pillar,
        MAX(budget_part) FILTER (WHERE budget_part IS NOT NULL) AS budget_part
      FROM ppb2026.source_document_citations
      WHERE entity IS NOT NULL
      GROUP BY entity
    `)

    const entities: MatrixEntity[] = []
    for (const row of entityMeta) {
      if (isExcludedEntity(row.entity)) continue
      const group = deriveGroup(row.pillar, row.budget_part)
      if (!group) continue
      entities.push({ entity: row.entity, group })
    }

    const groupRank = new Map(GROUP_ORDER.map((g, i) => [g, i]))
    entities.sort((a, b) => {
      const dg = (groupRank.get(a.group) ?? 99) - (groupRank.get(b.group) ?? 99)
      if (dg !== 0) return dg
      return a.entity.localeCompare(b.entity)
    })

    if (entities.length === 0) {
      return {
        entities,
        matrices: { ppb2026: [], ppb2027: [] },
      }
    }

    const cellRows = await queryMany<Row>(
      `
      WITH keep AS (SELECT unnest($1::text[]) AS entity),
      docs AS (
        SELECT bdv.version_slug, c.entity, c.ppb_full_document_symbol
        FROM ppb2026.source_document_citations c
        JOIN ppb2026.budget_documents bd
          ON c.origin_document ~ bd.match_pattern
        JOIN ppb2026.budget_document_versions bdv
          ON bdv.doc_slug = bd.slug
        JOIN keep k ON k.entity = c.entity
        WHERE bdv.version_slug IN ('ppb2026', 'ppb2027')
        GROUP BY bdv.version_slug, c.entity, c.ppb_full_document_symbol
      )
      SELECT a.version_slug,
             a.entity AS entity_a,
             b.entity AS entity_b,
             COUNT(*)::int AS shared_docs
      FROM docs a
      JOIN docs b
        ON a.version_slug = b.version_slug
       AND a.ppb_full_document_symbol = b.ppb_full_document_symbol
      GROUP BY 1, 2, 3
      `,
      [entities.map((e) => e.entity)],
    )

    // Stable index lookup so we can fill the matrices in one pass.
    const indexOf = new Map<string, number>()
    entities.forEach((e, i) => indexOf.set(e.entity, i))

    const empty = (): number[][] =>
      Array.from({ length: entities.length }, () =>
        Array(entities.length).fill(0),
      )

    const matrices: Record<VersionSlug, number[][]> = {
      ppb2026: empty(),
      ppb2027: empty(),
    }

    for (const r of cellRows) {
      const i = indexOf.get(r.entity_a)
      const j = indexOf.get(r.entity_b)
      if (i === undefined || j === undefined) continue
      matrices[r.version_slug][i][j] = r.shared_docs
    }

    return { entities, matrices }
  },
  ['citation-matrix-v1'],
  { revalidate: 3600 },
)
