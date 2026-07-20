/**
 * Client-safe types and helpers for the entity co-citation matrix. Kept free of
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
