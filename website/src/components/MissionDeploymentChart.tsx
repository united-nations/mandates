import type {
  Mission,
  MissionDeploymentMonth,
} from '@/lib/mission-implementation'

/**
 * Server-rendered SVG charts for the /missions page: a table-cell sparkline of
 * monthly uniformed deployment, and a small-multiple panel that overlays the
 * mandated (approved) uniformed ceiling on the actual deployment curve.
 *
 * Data: DPPA-DPO open data (monthly uniformed personnel; approved vs actual
 * posts per budget year), see docs/lens-impact/SOURCES.md.
 */

// Fixed month domain shared by all deployment charts: Jan 2010 – latest report.
const DOMAIN_START = 2010 * 12

function monthIndex(m: string): number {
  return Number(m.slice(0, 4)) * 12 + (Number(m.slice(5, 7)) - 1)
}

function areaPath(
  series: MissionDeploymentMonth[],
  domainEnd: number,
  yMax: number,
  w: number,
  h: number
): { line: string; area: string } {
  const span = Math.max(domainEnd - DOMAIN_START, 1)
  const pts = series.map((d) => {
    const x = ((monthIndex(d.m) - DOMAIN_START) / span) * w
    const y = h - (d.n / yMax) * h
    return [x, y] as const
  })
  const line = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join('')
  const first = pts[0]
  const last = pts[pts.length - 1]
  const area = `${line}L${last[0].toFixed(1)},${h}L${first[0].toFixed(1)},${h}Z`
  return { line, area }
}

/** Tiny in-table sparkline of monthly uniformed deployment since 2010. */
export function MissionDeploymentSpark({
  series,
  domainEnd,
  width = 110,
  height = 26,
}: {
  series: MissionDeploymentMonth[]
  domainEnd: number
  width?: number
  height?: number
}) {
  if (series.length < 2) {
    return <span className="text-xs text-gray-300">—</span>
  }
  const yMax = Math.max(...series.map((d) => d.n))
  const { line, area } = areaPath(series, domainEnd, yMax, width, height - 2)
  const peak = Math.max(...series.map((d) => d.n))
  const latest = series[series.length - 1]
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="overflow-visible"
    >
      <title>{`Uniformed personnel 2010–${latest.m.slice(0, 4)}; peak ${peak.toLocaleString('en-US')}, latest ${latest.n.toLocaleString('en-US')}`}</title>
      <g transform="translate(0,1)">
        <path d={area} fill="var(--color-un-blue)" opacity={0.15} />
        <path
          d={line}
          fill="none"
          stroke="var(--color-un-blue)"
          strokeWidth={1.25}
        />
      </g>
    </svg>
  )
}

/**
 * Small-multiple panel: actual monthly uniformed deployment (area) against the
 * approved uniformed ceiling per budget year (dashed step line).
 */
export function MissionMandateVsDeployedPanel({
  mission,
  domainEnd,
}: {
  mission: Mission
  domainEnd: number
}) {
  const W = 260
  const H = 96
  const series = mission.deployment
  if (series.length < 2) return null

  // Approved uniformed ceiling as [startMonthIndex, endMonthIndex, value].
  // Budget year "2024/25" runs July 2024 – June 2025.
  const ceilings = mission.personnel
    .filter((p) => p.approvedUniformed > 0)
    .map((p) => {
      const y = Number(p.year.slice(0, 4))
      return {
        from: y * 12 + 6,
        to: y * 12 + 18,
        value: p.approvedUniformed,
      }
    })

  const yMax = Math.max(
    ...series.map((d) => d.n),
    ...ceilings.map((c) => c.value),
    1
  )
  const span = Math.max(domainEnd - DOMAIN_START, 1)
  const x = (mi: number) =>
    Math.min(Math.max(((mi - DOMAIN_START) / span) * W, 0), W)
  const y = (v: number) => H - (v / yMax) * H

  const { line, area } = areaPath(series, domainEnd, yMax, W, H)
  const steps = ceilings
    .map(
      (c) =>
        `M${x(c.from).toFixed(1)},${y(c.value).toFixed(1)}L${x(c.to).toFixed(1)},${y(c.value).toFixed(1)}`
    )
    .join('')

  const latest = series[series.length - 1]
  const latestCeil = ceilings.length > 0 ? ceilings[ceilings.length - 1] : null
  const gap =
    latestCeil && latestCeil.value > 0 ? latest.n / latestCeil.value : null

  const startYear = 2010
  const endYear = Math.floor(domainEnd / 12)

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-gray-900">
          {mission.acronym}
        </span>
        {gap !== null && (
          <span
            className="text-xs text-gray-500"
            title="Latest reported deployment as a share of the approved uniformed ceiling"
          >
            {Math.round(gap * 100)}% of ceiling
          </span>
        )}
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H + 14}`}
        role="img"
        aria-label={`${mission.acronym}: deployed uniformed personnel vs approved ceiling, 2010–${endYear}`}
        className="mt-1"
      >
        <title>{`${mission.acronym}: latest deployment ${latest.n.toLocaleString('en-US')} (${latest.m})${latestCeil ? `, approved ceiling ${latestCeil.value.toLocaleString('en-US')}` : ''}`}</title>
        <path d={area} fill="var(--color-un-blue)" opacity={0.15} />
        <path
          d={line}
          fill="none"
          stroke="var(--color-un-blue)"
          strokeWidth={1.5}
        />
        <path
          d={steps}
          fill="none"
          stroke="var(--color-trout)"
          strokeWidth={1.25}
          strokeDasharray="3 2.5"
        />
        <line
          x1={0}
          y1={H}
          x2={W}
          y2={H}
          stroke="var(--color-geyser)"
          strokeWidth={1}
        />
        <text
          x={0}
          y={H + 11}
          className="fill-gray-400"
          style={{ fontSize: 9 }}
        >
          {startYear}
        </text>
        <text
          x={W}
          y={H + 11}
          textAnchor="end"
          className="fill-gray-400"
          style={{ fontSize: 9 }}
        >
          {endYear}
        </text>
      </svg>
      <div className="mt-0.5 text-xs text-gray-500">
        {latest.n.toLocaleString('en-US')} deployed
        {latestCeil
          ? ` · ${latestCeil.value.toLocaleString('en-US')} approved`
          : ''}
      </div>
    </div>
  )
}
