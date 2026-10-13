/**
 * Organ Data Access
 *
 * Organs are stored in ppb2026.organs and seeded via sql/migrations/002_seed_organs.sql.
 */

import { unstable_cache } from 'next/cache'
import { cache } from 'react'
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
 *
 * Wrapped in React `cache()` as well as unstable_cache. unstable_cache dedupes
 * across requests but not between concurrent callers of a COLD entry: one
 * explorer render asks for the organs from three independent places at once
 * (the page, getSharedPageData and getOrganMap), all three missed, and all
 * three ran this query. React `cache()` gives one shared promise per request,
 * so the three calls collapse into one.
 */
const loadAllOrgans = unstable_cache(
  async (): Promise<Organ[]> => {
    const rows = await queryMany<OrganRow>(
      `/* trace:organs.all */
       SELECT short, long, website FROM ppb2026.organs ORDER BY sort_order`,
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

export const getAllOrgans = cache(loadAllOrgans)

/**
 * Get a keyed map of organs by short name for O(1) lookups.
 *
 * Also request-cached: several callers build this map per render, and each
 * rebuild is a fresh Map over the same rows.
 */
export const getOrganMap = cache(async (): Promise<Map<string, Organ>> => {
  const organs = await getAllOrgans()
  return new Map(organs.map((o) => [o.short, o]))
})
