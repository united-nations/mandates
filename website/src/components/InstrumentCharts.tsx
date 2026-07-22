import type { SanctionsRegime } from '@/lib/sanctions-implementation'

/**
 * Server-rendered SVG charts for /instruments (sanctions + treaties).
 * No client interactivity — hover detail via native <title> tooltips, matching
 * the /missions deployment charts. See docs/lens-impact/SOURCES-ROUND2.md.
 */

const nf = new Intl.NumberFormat('en-US')

/**
 * Yearly designations across all regimes as vertical bars. Highlights the peak
 * year (2001, the post-9/11 Al-Qaida expansion) in un-blue-deep.
 */
export function DesignationCadenceChart({
  byYear,
  height = 150,
}: {
  byYear: Record<string, number>
  height?: number
}) {
  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => a - b)
  if (years.length === 0) return null
  const start = years[0]
  const end = years[years.length - 1]
  const span = end - start + 1
  const max = Math.max(...years.map((y) => byYear[y]))
  const peakYear = years.reduce(
    (p, y) => (byYear[y] > byYear[p] ? y : p),
    start
  )

  const w = 720
  const padB = 18 // x-axis labels
  const padT = 15 // headroom for the peak annotation
  const base = height - padB // baseline y
  const barArea = base - padT
  const bw = w / span

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="UN sanctions designations per year across all regimes"
    >
      {[0, 0.5, 1].map((f) => (
        <line
          key={f}
          x1={0}
          x2={w}
          y1={base - f * barArea}
          y2={base - f * barArea}
          className="stroke-border"
          strokeWidth={1}
        />
      ))}
      {years.map((y) => {
        const h = (byYear[y] / max) * barArea
        const x = ((y - start) / span) * w
        return (
          <rect
            key={y}
            x={x + bw * 0.12}
            y={base - h}
            width={bw * 0.76}
            height={h}
            className={y === peakYear ? 'fill-un-blue-deep' : 'fill-un-blue/55'}
          >
            <title>{`${y}: ${nf.format(byYear[y])} designations still on the list`}</title>
          </rect>
        )
      })}
      {[start, peakYear, end].map((y) => (
        <text
          key={y}
          x={((y - start) / span) * w + bw / 2}
          y={height - 4}
          textAnchor="middle"
          className="fill-gray-400 text-[10px]"
        >
          {y}
        </text>
      ))}
      <text
        x={((peakYear - start) / span) * w + bw / 2}
        y={11}
        textAnchor="middle"
        className="fill-un-blue-deep text-[10px] font-medium"
      >
        {`${peakYear}: ${byYear[peakYear]}`}
      </text>
    </svg>
  )
}

/** Tiny per-regime bar sparkline of designations per year, for a table cell. */
export function RegimeCadenceSpark({
  regime,
  start,
  end,
  width = 120,
  height = 26,
}: {
  regime: SanctionsRegime
  start: number
  end: number
  width?: number
  height?: number
}) {
  const by = regime.listings_by_year
  const years = Object.keys(by).map(Number)
  if (years.length === 0) {
    return <span className="text-xs text-gray-300">—</span>
  }
  const span = Math.max(end - start + 1, 1)
  const max = Math.max(...years.map((y) => by[y]))
  const bw = width / span
  const last = Math.max(...years)
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-[26px] w-[120px]"
      role="img"
      aria-label={`${regime.code} designations by year`}
    >
      {years.map((y) => {
        const h = Math.max((by[y] / max) * height, 1.5)
        return (
          <rect
            key={y}
            x={((y - start) / span) * width}
            y={height - h}
            width={Math.max(bw * 0.8, 1)}
            height={h}
            className={y === last ? 'fill-un-blue-deep' : 'fill-un-blue/50'}
          >
            <title>{`${y}: ${by[y]}`}</title>
          </rect>
        )
      })}
    </svg>
  )
}

function GapBar({
  label,
  parties,
  max,
  tone,
}: {
  label: string
  parties: number
  max: number
  tone: 'parent' | 'child'
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 shrink-0 text-right text-xs text-gray-500">
        {label}
      </div>
      <div className="h-3.5 flex-1 rounded-xs bg-muted">
        <div
          className={
            tone === 'parent'
              ? 'h-3.5 rounded-xs bg-un-blue'
              : 'h-3.5 rounded-xs bg-au-chico'
          }
          style={{ width: `${(parties / max) * 100}%` }}
          title={`${label}: ${parties} states parties`}
        />
      </div>
      <div className="w-8 shrink-0 text-xs text-gray-700 tabular-nums">
        {parties}
      </div>
    </div>
  )
}

/**
 * Paired horizontal bars: a parent treaty's parties vs one of its optional
 * protocols, scaled to the same max so the ratification gap is visible.
 */
export function ProtocolGapRow({
  parentLabel,
  parentParties,
  childLabel,
  childParties,
  max,
}: {
  parentLabel: string
  parentParties: number
  childLabel: string
  childParties: number
  max: number
}) {
  return (
    <div className="space-y-1">
      <GapBar
        label={parentLabel}
        parties={parentParties}
        max={max}
        tone="parent"
      />
      <GapBar
        label={childLabel}
        parties={childParties}
        max={max}
        tone="child"
      />
    </div>
  )
}
