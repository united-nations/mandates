import sanctionsData from '@/data/sanctions-implementation.json'

/**
 * Sanctions implementation data: the UN Security Council Consolidated Sanctions
 * List (official XML — every individual and entity currently designated under an
 * active SC sanctions regime) joined with the SC sanctions resolutions in our
 * Digital Library mirror, on the sanctions regime → its establishing resolution
 * and country/thematic UNBIS subject.
 *
 * Produced by `data-processing/scripts/build_sanctions_implementation.py`;
 * research notes in `docs/lens-impact/SOURCES-ROUND2.md`.
 */

export interface SanctionsRegime {
  code: string
  name: string
  establishing_resolution: string
  establishing_in_db: boolean
  establishing_date: string | null
  subjects: string[]
  sc_sanctions_resolutions_in_db: number
  sc_sanctions_documents_in_db: number
  individuals_listed: number
  entities_listed: number
  total_listed: number
  first_listing: string | null
  last_listing: string | null
  listings_by_year: Record<string, number>
}

export interface SanctionsData {
  generated: string
  list_generated: string
  source: string
  regime_count: number
  totals: {
    individuals_listed: number
    entities_listed: number
    total_listed: number
    sc_sanctions_resolutions_in_db: number
    listings_by_year: Record<string, number>
  }
  regimes: SanctionsRegime[]
  notes: { unknown_list_types: Record<string, number> }
}

export function getSanctionsImplementation(): SanctionsData {
  return sanctionsData as unknown as SanctionsData
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

/** Years elapsed since a listing date (or null). */
export function yearsSince(iso: string | null, asOf: string): number | null {
  if (!iso) return null
  const then = Date.parse(iso.slice(0, 10))
  if (Number.isNaN(then)) return null
  return (Date.parse(asOf.slice(0, 10)) - then) / (1000 * 60 * 60 * 24 * 365.25)
}

/**
 * Find the sanctions regime this resolution establishes, if any (matched on the
 * establishing resolution symbol). Used for the mandate-detail cross-link chip.
 */
export function regimeForResolution(symbol: string): SanctionsRegime | null {
  const norm = normalizeSymbol(symbol)
  return (
    getSanctionsImplementation().regimes.find(
      (r) => normalizeSymbol(r.establishing_resolution) === norm
    ) ?? null
  )
}
