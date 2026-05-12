/**
 * Organ Data Access
 *
 * Organs are stored in ppb2026.organs and seeded via sql/migrations/002_seed_organs.sql.
 */

import { unstable_cache } from 'next/cache'
import type { Organ } from '@/types'
import { queryMany } from '../db/query'

interface OrganRow {
  short: string
  long: string
  website: string | null
}

/**
 * Load all organs ordered by sort_order.
 * Cached across requests; revalidates every hour.
 */
export const getAllOrgans = unstable_cache(
  async (): Promise<Organ[]> => {
    const rows = await queryMany<OrganRow>(
      `SELECT short, long, website FROM ppb2026.organs ORDER BY sort_order`,
      []
    )
    return rows.map((r) => ({
      short: r.short,
      long: r.long,
      website: r.website ?? undefined,
    }))
  },
  ['organs'],
  { revalidate: 3600 }
)

/**
 * Get a keyed map of organs by short name for O(1) lookups.
 */
export async function getOrganMap(): Promise<Map<string, Organ>> {
  const organs = await getAllOrgans()
  return new Map(organs.map((o) => [o.short, o]))
}

