/**
 * Entity Database Queries
 *
 * Fetches entity data from systemchart.entities table.
 */

import { queryMany, queryOne } from './query'
import type { Entity } from '@/types'

/**
 * Get all entities from the database
 */
export async function getAllEntities(): Promise<Entity[]> {
  const query = `
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
}

/**
 * Get entity by short code
 */
export async function getEntityByCode(code: string): Promise<Entity | null> {
  const query = `
    SELECT
      entity,
      entity_long
    FROM systemchart.entities
    WHERE entity = $1
  `

  const row = await queryOne<{ entity: string; entity_long: string }>(query, [code])

  if (!row) return null

  return {
    entity: row.entity,
    entity_long: row.entity_long || row.entity,
  }
}

/**
 * Get entity details map for quick lookups
 */
export async function getEntityMap(): Promise<Map<string, Entity>> {
  const entities = await getAllEntities()
  const map = new Map<string, Entity>()

  entities.forEach((entity) => {
    map.set(entity.entity, entity)
  })

  return map
}

/**
 * Search entities by name (partial match)
 */
export async function searchEntities(searchTerm: string, limit = 10): Promise<Entity[]> {
  const query = `
    SELECT
      entity,
      entity_long
    FROM systemchart.entities
    WHERE
      LOWER(entity) LIKE $1
      OR LOWER(entity_long) LIKE $1
    ORDER BY
      CASE WHEN LOWER(entity) = $2 THEN 0 ELSE 1 END,
      entity_long
    LIMIT $3
  `

  const rows = await queryMany<{ entity: string; entity_long: string }>(query, [
    `%${searchTerm.toLowerCase()}%`,
    searchTerm.toLowerCase(),
    limit,
  ])

  return rows.map((row) => ({
    entity: row.entity,
    entity_long: row.entity_long || row.entity,
  }))
}
