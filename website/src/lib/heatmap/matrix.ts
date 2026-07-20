/**
 * Client-safe types and helpers for the heatmap matrices. Kept free of
 * server-only imports (no `pg` pool) so client components can import them.
 */

export interface CoCitationMatrix {
  /** Entity codes present in this matrix (sorted). */
  entities: string[]
  /** Shared-document count keyed by `pairKey(a, b)`. A missing key means 0. */
  pairs: Record<string, number>
  /** Per-entity distinct document-symbol count (the diagonal). */
  totals: Record<string, number>
}

/** Canonical, order-independent key for an entity pair. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

export interface OrganEntityMatrix {
  /** Organ short codes present in this matrix. */
  organs: string[]
  /** Entity codes present in this matrix. */
  entities: string[]
  /**
   * Count of documents adopted by an organ and cited by an entity, keyed by
   * `organEntityKey(organ, entity)`. A missing key means 0.
   */
  cells: Record<string, number>
  /** Organ short code → long display name, for row labels/tooltips. */
  organLabels: Record<string, string>
}

/**
 * Directional key for an (organ, entity) cell. A single "|" separator is
 * unambiguous because neither organ short codes nor entity codes contain "|"
 * (they hold only letters, digits, spaces and hyphens).
 */
export function organEntityKey(organ: string, entity: string): string {
  return `${organ}|${entity}`
}
