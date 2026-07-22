import treatyData from '@/data/treaty-implementation.json'

/**
 * Treaty implementation data: the UN Treaty Collection (MTDSG) ratification
 * status of the treaties the General Assembly created, joined with the GA
 * resolutions in our Digital Library mirror that adopted them, on the adopting
 * resolution symbol.
 *
 * Produced by `data-processing/scripts/build_treaty_implementation.py`;
 * research notes in `docs/lens-impact/SOURCES-ROUND2.md`.
 */

export interface Treaty {
  short: string
  name: string
  category: string
  mtdsg_no: string
  adopting_resolution: string
  adopting_resolution_in_db: boolean
  adopting_resolution_date: string | null
  db_title: string | null
  entry_into_force: string | null
  in_force: boolean
  parties: number
  signatories: number
  first_ratification_year: number | null
  last_ratification_year: number | null
}

export interface TreatyData {
  generated: string
  source: string
  treaty_count: number
  totals: {
    adopting_resolutions_in_db: number
    distinct_adopting_resolutions: number
    in_force: number
    sum_parties: number
  }
  treaties: Treaty[]
}

export function getTreatyImplementation(): TreatyData {
  return treatyData as unknown as TreatyData
}

/** Normalize a UN document symbol for comparison: strip spaces, uppercase. */
export function normalizeSymbol(symbol: string): string {
  return symbol.replace(/\s+/g, '').toUpperCase()
}

/** undocs.org resolver for a UN document symbol. */
export function undocsUrl(symbol: string): string {
  return `https://undocs.org/en/${encodeURIComponent(symbol.replace(/\s+/g, ''))}`
}

/** Internal mandate detail page URL for a document symbol. */
export function mandateHref(symbol: string): string {
  const segments = symbol.split('/').map((s) => encodeURIComponent(s))
  return `/mandate/${segments.join('/')}`
}

/** Order categories consistently across the page. */
export const CATEGORY_ORDER = ['Human Rights', 'Crime', 'Disarmament'] as const

/**
 * Every treaty adopted by this resolution, if any (a single resolution can adopt
 * several — e.g. res 2200(XXI) → ICESCR + ICCPR + OP1). Used for the mandate-
 * detail cross-link chip.
 */
export function treatiesForResolution(symbol: string): Treaty[] {
  const norm = normalizeSymbol(symbol)
  return getTreatyImplementation().treaties.filter(
    (t) => normalizeSymbol(t.adopting_resolution) === norm
  )
}

/**
 * Reference for scaling "toward universality" ratification bars. The UN has 193
 * members, but several non-member states (Holy See, State of Palestine, Cook
 * Islands, Niue) are treaty parties, so the most-ratified treaties exceed 193 —
 * scale to 197 so bars never overflow.
 */
export const UNIVERSALITY_REF = 197
