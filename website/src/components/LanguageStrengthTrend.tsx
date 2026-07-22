'use client'

import { useMemo, useState } from 'react'

import type {
  BindingnessDecadePoint,
  LanguageBody,
} from '@/lib/data/language-strength'

const BODIES: { body: LanguageBody; short: string }[] = [
  { body: 'General Assembly', short: 'GA' },
  { body: 'Security Council', short: 'SC' },
  { body: 'Economic and Social Council', short: 'ECOSOC' },
]

// Fixed drawing geometry — the SVG scales to the container width.
const W = 720
const H = 240
const PAD_L = 34 // y-axis labels
const PAD_R = 58 // direct line labels
const PAD_T = 12
const PAD_B = 22

interface SeriesPoint {
  decade: number
  share: number // % directive of classified operative paragraphs
  directive: number
  hortatory: number
}

/**
 * "Directive vs. requesting language per decade" line chart with a body
 * toggle. All three organs are always drawn; the selected one is emphasised in
 * un-blue, the others recede to grey context lines — same grey+blue overlay
 * language as {@link YearOverlayTrend}. Identity never rests on hue alone:
 * every line carries a direct end label, and the toggle chips restate it.
 */
export function LanguageStrengthTrend({
  data,
}: {
  data: BindingnessDecadePoint[]
}) {
  const [selected, setSelected] = useState<LanguageBody>('General Assembly')
  const [hoverDecade, setHoverDecade] = useState<number | null>(null)

  const series = useMemo(() => {
    const bySeries = new Map<LanguageBody, SeriesPoint[]>()
    for (const { body } of BODIES) bySeries.set(body, [])
    for (const d of data) {
      bySeries.get(d.body)?.push({
        decade: d.decade,
        share: (100 * d.directive) / (d.directive + d.hortatory),
        directive: d.directive,
        hortatory: d.hortatory,
      })
    }
    for (const pts of bySeries.values()) pts.sort((a, b) => a.decade - b.decade)
    return bySeries
  }, [data])

  const decades = useMemo(
    () => [...new Set(data.map((d) => d.decade))].sort((a, b) => a - b),
    [data]
  )

  const maxShare = useMemo(() => {
    const m = Math.max(
      10,
      ...data.map((d) => (100 * d.directive) / (d.directive + d.hortatory))
    )
    return Math.ceil(m / 10) * 10
  }, [data])

  if (decades.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No classified paragraphs available.
      </p>
    )
  }

  const minDecade = decades[0]
  const maxDecade = decades[decades.length - 1]
  const x = (decade: number) =>
    PAD_L +
    ((decade - minDecade) / Math.max(1, maxDecade - minDecade)) *
      (W - PAD_L - PAD_R)
  const y = (share: number) =>
    PAD_T + (1 - share / maxShare) * (H - PAD_T - PAD_B)

  const yTicks: number[] = []
  for (let t = 0; t <= maxShare; t += 10) yTicks.push(t)

  const path = (pts: SeriesPoint[]) =>
    pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.decade)},${y(p.share)}`)
      .join(' ')

  const hoverPoints =
    hoverDecade === null
      ? null
      : BODIES.map(({ body, short }) => ({
          short,
          point: series.get(body)?.find((p) => p.decade === hoverDecade),
        })).filter((e) => e.point)

  return (
    <div>
      <p className="mb-3 max-w-3xl text-sm text-gray-500">
        Of the operative paragraphs each organ adopted per decade, the share
        that opens with a directive verb (<em>decides</em>, <em>authorizes</em>,{' '}
        <em>approves</em>) rather than a requesting one (<em>requests</em>,{' '}
        <em>urges</em>, <em>encourages</em>). Directive here describes the
        strength of the wording, not legal force — a General Assembly resolution
        remains a recommendation however it is phrased.
      </p>

      {/* Body toggle + hover readout */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
        <div className="flex flex-wrap gap-1.5">
          {BODIES.map(({ body, short }) => {
            const active = selected === body
            return (
              <button
                key={body}
                type="button"
                onClick={() => setSelected(body)}
                aria-pressed={active}
                className={`rounded-full border px-2.5 py-0.5 transition-colors ${
                  active
                    ? 'border-un-blue/30 bg-un-blue/10 font-medium text-un-blue'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="hidden sm:inline">{body}</span>
                <span className="sm:hidden">{short}</span>
              </button>
            )
          })}
        </div>
        <span className="ml-auto text-gray-500">
          {hoverDecade !== null && hoverPoints ? (
            <span>
              <span className="font-medium text-gray-900">{hoverDecade}s</span>
              {hoverPoints.map(({ short, point }) => (
                <span key={short}>
                  {' · '}
                  {short}{' '}
                  <span className="font-medium text-gray-900">
                    {point!.share.toFixed(1)}%
                  </span>
                </span>
              ))}
            </span>
          ) : (
            <span className="text-gray-400">Hover a decade for details</span>
          )}
        </span>
      </div>

      {/* Horizontal scroll on narrow screens so the axis text stays legible
          instead of the whole SVG scaling down. */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[560px]"
          role="img"
          aria-label="Share of directive language per decade for the General Assembly, Security Council and Economic and Social Council"
        >
          {/* Gridlines + y labels */}
          {yTicks.map((t) => (
            <g key={t}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={y(t)}
                y2={y(t)}
                className="stroke-gray-200"
                strokeWidth={1}
              />
              <text
                x={PAD_L - 6}
                y={y(t) + 3}
                textAnchor="end"
                className="fill-gray-400 text-[10px] tabular-nums"
              >
                {t}%
              </text>
            </g>
          ))}

          {/* Decade x labels */}
          {decades.map((d) => (
            <text
              key={d}
              x={x(d)}
              y={H - 6}
              textAnchor="middle"
              className={`text-[10px] tabular-nums ${
                hoverDecade === d ? 'fill-gray-700' : 'fill-gray-400'
              }`}
            >
              {`${d}s`}
            </text>
          ))}

          {/* Context lines first, selected line on top */}
          {[
            ...BODIES.filter((b) => b.body !== selected),
            ...BODIES.filter((b) => b.body === selected),
          ].map(({ body, short }) => {
            const pts = series.get(body) ?? []
            if (pts.length === 0) return null
            const active = body === selected
            const last = pts[pts.length - 1]
            return (
              <g key={body}>
                <path
                  d={path(pts)}
                  fill="none"
                  strokeWidth={active ? 2 : 1.5}
                  className={active ? 'stroke-un-blue' : 'stroke-gray-300'}
                />
                {pts.map((p) => (
                  <circle
                    key={p.decade}
                    cx={x(p.decade)}
                    cy={y(p.share)}
                    r={
                      hoverDecade === p.decade
                        ? active
                          ? 4
                          : 3
                        : active
                          ? 3
                          : 2
                    }
                    className={active ? 'fill-un-blue' : 'fill-gray-300'}
                  />
                ))}
                {/* Direct end label */}
                <text
                  x={x(last.decade) + 8}
                  y={y(last.share) + 3}
                  className={`text-[10px] font-medium ${
                    active ? 'fill-un-blue' : 'fill-gray-400'
                  }`}
                >
                  {short}
                </text>
              </g>
            )
          })}

          {/* Invisible hover columns */}
          {decades.map((d, i) => {
            const left = i === 0 ? PAD_L : (x(decades[i - 1]) + x(d)) / 2
            const right =
              i === decades.length - 1
                ? W - PAD_R
                : (x(d) + x(decades[i + 1])) / 2
            return (
              <rect
                key={d}
                x={left}
                y={PAD_T}
                width={right - left}
                height={H - PAD_T - PAD_B}
                fill="transparent"
                onMouseEnter={() => setHoverDecade(d)}
                onMouseLeave={() => setHoverDecade(null)}
              />
            )
          })}
        </svg>
      </div>
    </div>
  )
}
