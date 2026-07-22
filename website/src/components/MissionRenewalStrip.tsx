import type { HeartbeatChainRow, ScRenewal } from '@/lib/sc-renewals'

/**
 * A per-mission "mini heartbeat": each Security Council renewal drawn as a
 * segment from its adoption date to the expiry it sets, coloured by leash bucket
 * (how long the Council let the mandate run before the next review). Server-
 * rendered SVG; the segment titles carry the resolution + dates on hover.
 *
 * Shares its leash buckets and colours with the /secretariat MandateHeartbeat.
 */

const BUCKETS = [
  { max: 100, color: 'var(--color-tier-1)', label: '≤ 3 months' },
  { max: 250, color: 'var(--color-tier-2)', label: '≈ 6 months' },
  { max: Infinity, color: 'var(--color-un-blue)', label: '≈ 1 year +' },
] as const

export function renewalBucketColor(leashDays: number): string {
  for (const b of BUCKETS) if (leashDays <= b.max) return b.color
  return BUCKETS[BUCKETS.length - 1].color
}

export const RENEWAL_BUCKETS = BUCKETS

function ts(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`)
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * @param chain      the mission's renewal chain (null → renders a dash)
 * @param now        the "now" marker (extraction date)
 * @param domainMin  shared left edge (ms) so strips across rows align; falls back
 *                   to the chain's own first adoption when omitted
 * @param domainMax  shared right edge (ms); falls back to max(now, last expiry)
 */
export function MissionRenewalStrip({
  chain,
  now,
  domainMin,
  domainMax,
  width = 150,
  height = 16,
}: {
  chain: HeartbeatChainRow | null
  now: string
  domainMin?: number
  domainMax?: number
  width?: number
  height?: number
}) {
  if (!chain || chain.renewals.length === 0) {
    return <span className="text-xs text-gray-300">—</span>
  }
  const renewals = chain.renewals
  const min = domainMin ?? Math.min(...renewals.map((r) => ts(r.adopted)))
  const max =
    domainMax ?? Math.max(ts(now), ...renewals.map((r) => ts(r.until)))
  const span = Math.max(max - min, 1)
  const barH = Math.min(height - 4, 8)
  const y = (height - barH) / 2
  const x = (t: number) => ((t - min) / span) * width

  const nowX = x(ts(now))
  const last = renewals.reduce((a, b) => (a.until > b.until ? a : b))
  const currentLeashMonths = Math.round(chain.currentLeash / 30)

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      role="img"
      aria-label={`${chain.label}: ${renewals.length} renewals, current leash ${chain.currentLeash} days`}
    >
      <title>
        {`${chain.renewals.length} renewals · current leash ${chain.currentLeash} days (~${currentLeashMonths} months) · latest expiry ${fmtDate(last.until)}`}
      </title>
      {/* baseline */}
      <line
        x1={0}
        y1={height / 2}
        x2={width}
        y2={height / 2}
        stroke="var(--color-geyser)"
        strokeWidth={0.75}
      />
      {renewals.map((r: ScRenewal) => {
        const left = Math.max(0, x(ts(r.adopted)))
        const right = Math.min(width, x(ts(r.until)))
        const w = Math.max(1.5, right - left)
        return (
          <rect
            key={`${r.symbol}-${r.until}`}
            x={left}
            y={y}
            width={w}
            height={barH}
            rx={1}
            fill={renewalBucketColor(r.leash_days)}
            opacity={chain.active ? 1 : 0.55}
          >
            <title>
              {`${r.symbol}: ${fmtDate(r.adopted)} → ${fmtDate(r.until)} (${r.leash_days} d)`}
            </title>
          </rect>
        )
      })}
      {/* current-leash "now" indicator */}
      <line
        x1={nowX}
        y1={0}
        x2={nowX}
        y2={height}
        stroke="var(--color-trout)"
        strokeWidth={1}
        strokeDasharray="1.5 1.5"
      />
    </svg>
  )
}
