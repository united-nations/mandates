/**
 * Organ Data Access
 *
 * Organs are defined in data/organs.json (small static list maintained manually).
 * Module-level caching avoids re-reading the file on every request.
 */

import { readFile } from 'fs/promises'
import path from 'path'
import type { Organ } from '@/types'

// Module-level in-memory cache (lives for the lifetime of the server process)
let organsCache: Organ[] | null = null
let organMapCache: Map<string, Organ> | null = null

/**
 * Load all organs from organs.json
 */
export async function getAllOrgans(): Promise<Organ[]> {
  if (organsCache) return organsCache

  const filePath = path.join(process.cwd(), 'data', 'organs.json')
  const raw = await readFile(filePath, 'utf-8')
  const data = JSON.parse(raw) as Array<{ short?: string; long?: string; website?: string }>

  organsCache = data.map((item) => ({
    short: item.short ?? '',
    long: item.long ?? '',
    website: item.website,
  }))

  return organsCache
}

/**
 * Get a keyed map of organs by short name for O(1) lookups
 */
export async function getOrganMap(): Promise<Map<string, Organ>> {
  if (organMapCache) return organMapCache

  const organs = await getAllOrgans()
  organMapCache = new Map(organs.map((o) => [o.short, o]))

  return organMapCache
}

/**
 * Get a single organ by its short name
 */
export async function getOrganByShortName(shortName: string): Promise<Organ | null> {
  const map = await getOrganMap()
  return map.get(shortName) ?? null
}

/**
 * Clear cache — call when organs.json is updated at runtime
 */
export function clearOrgansCache(): void {
  organsCache = null
  organMapCache = null
}
