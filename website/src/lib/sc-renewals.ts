import rawData from '@/data/sc-renewals.json'

/**
 * Security Council mandate renewals ("extends/renews … until <date>") extracted
 * from S/RES operative paragraphs by `website/scripts/extract-sc-renewals.mjs`
 * (re-run that script to refresh `src/data/sc-renewals.json`).
 *
 * A *chain* is one continuously renewed thing: a peacekeeping or political
 * mission, a sanctions regime (incl. its panel of experts), or a standing
 * authorization such as ISAF. The *leash* is the number of days between the
 * adoption of a renewal and the expiry date it sets.
 */

export type RenewalKind = 'mission' | 'sanctions' | 'panel' | 'authorization'

export interface ScRenewal {
  chain: string
  symbol: string
  /** Adoption date, ISO yyyy-mm-dd. */
  adopted: string
  /** Expiry date set by the renewal, ISO yyyy-mm-dd. */
  until: string
  leash_days: number
  kind: RenewalKind
  method: string
}

export interface HeartbeatChainRow {
  id: string
  label: string
  kind: RenewalKind
  renewals: ScRenewal[]
  /** Latest expiry across the chain's renewals. */
  lastUntil: string
  /** Leash of the most recent renewal, in days. */
  currentLeash: number
  /** True when the latest expiry is in the future (as of extraction). */
  active: boolean
}

export interface MedianLeashPoint {
  year: number
  medianDays: number
  count: number
}

export interface HeartbeatData {
  /** Extraction date, ISO yyyy-mm-dd — doubles as the "now" marker. */
  generated: string
  /** Active chains, shortest current leash first. */
  active: HeartbeatChainRow[]
  /** Ended chains, most recently expired first. */
  ended: HeartbeatChainRow[]
  medianTrend: MedianLeashPoint[]
  renewalCount: number
}

interface RawFile {
  generated: string
  chains: { id: string; label: string | null; kind: string; renewals: number }[]
  renewals: ScRenewal[]
}

const MIN_RENEWALS_PER_CHAIN = 2

/** Median of a non-empty numeric array. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

let cache: HeartbeatData | null = null

export function getScRenewalData(): HeartbeatData {
  if (cache) return cache
  const data = rawData as unknown as RawFile

  const bySymbolChain = new Map<string, ScRenewal[]>()
  for (const r of data.renewals) {
    const list = bySymbolChain.get(r.chain) ?? []
    list.push(r)
    bySymbolChain.set(r.chain, list)
  }

  const rows: HeartbeatChainRow[] = []
  for (const meta of data.chains) {
    const renewals = (bySymbolChain.get(meta.id) ?? []).sort((a, b) =>
      a.adopted.localeCompare(b.adopted)
    )
    if (renewals.length < MIN_RENEWALS_PER_CHAIN) continue
    const last = renewals.reduce((a, b) => (a.until > b.until ? a : b))
    rows.push({
      id: meta.id,
      label: meta.label ?? meta.id,
      kind: meta.kind as RenewalKind,
      renewals,
      lastUntil: last.until,
      currentLeash: last.leash_days,
      active: last.until >= data.generated,
    })
  }

  const active = rows
    .filter((r) => r.active)
    .sort(
      (a, b) =>
        a.currentLeash - b.currentLeash ||
        a.lastUntil.localeCompare(b.lastUntil)
    )
  const ended = rows
    .filter((r) => !r.active)
    .sort((a, b) => b.lastUntil.localeCompare(a.lastUntil))

  // Median leash per adoption year across ALL extracted renewals.
  const byYear = new Map<number, number[]>()
  for (const r of data.renewals) {
    const y = Number(r.adopted.slice(0, 4))
    const list = byYear.get(y) ?? []
    list.push(r.leash_days)
    byYear.set(y, list)
  }
  const medianTrend = [...byYear.entries()]
    .map(([year, leashes]) => ({
      year,
      medianDays: median(leashes),
      count: leashes.length,
    }))
    .sort((a, b) => a.year - b.year)

  cache = {
    generated: data.generated,
    active,
    ended,
    medianTrend,
    renewalCount: data.renewals.length,
  }
  return cache
}

/**
 * Renewal chain for a single mission, joined on the mission acronym (the chain
 * `id` in the extraction IS the acronym). Returns null when the mission has no
 * extracted renewal chain (open-ended mandates, or renewal-by-exchange-of-letters).
 * Powers the per-mission "mini heartbeat" strip on /missions.
 */
export function getMissionChain(acronym: string): HeartbeatChainRow | null {
  const all = getScRenewalData()
  return [...all.active, ...all.ended].find((c) => c.id === acronym) ?? null
}

/** The extraction date, doubling as the "now" marker for renewal strips. */
export function renewalsGenerated(): string {
  return getScRenewalData().generated
}
