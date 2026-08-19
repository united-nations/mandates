/**
 * Entity Database Queries
 *
 * Fetches entity data from systemchart.entities table.
 */

import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { queryMany } from '../db/query'
import type { Entity } from '@/types'

/**
 * Get all entities from the database.
 * Cached across requests; revalidates every hour.
 *
 * Also React-`cache()`d below, so concurrent callers within one render share a
 * single promise instead of each missing a cold unstable_cache entry.
 */
const loadAllEntities = unstable_cache(
  async (): Promise<Entity[]> => {
    const query = `
      /* trace:entities.all */
      SELECT
        entity,
        entity_long
      FROM systemchart.entities
      WHERE entity IS NOT NULL AND entity != ''
      ORDER BY entity_long
    `

    const rows = await queryMany<{ entity: string; entity_long: string }>(query)

    return rows.map((row) => ({
      entity: row.entity,
      entity_long: row.entity_long || row.entity,
    }))
  },
  ['entities'],
  { revalidate: 3600 }
)

export const getAllEntities = cache(loadAllEntities)
