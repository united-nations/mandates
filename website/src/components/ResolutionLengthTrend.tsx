'use client'

import { useMemo, useState } from 'react'

import type {
  LengthBody,
  ResolutionLengthPoint,
} from '@/lib/data/resolution-length'

const BODIES: { body: LengthBody; short: string }[] = [
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

/**
 * "How long is a resolution?" — median paragraphs per document per year, with a
 * body toggle.
 *
 * Deliberately built to the same rules as {@link LanguageStrengthTrend}: all
 * three organs are always drawn, the selected one is emphasised in un-blue and
 * the others recede to grey context lines. Identity never rests on hue alone —
 * every line carries a direct end label and the toggle chips restate it, which
 * is also what keeps it readable for colour-vision deficiency without a
 * categorical palette.
 *
 * The y-axis starts at zero, because the reader is comparing magnitudes; a
 * clipped axis would exaggerate a two-paragraph drift into a cliff.
 */
export function ResolutionLengthTrend({
  data,
}: {
  data: ResolutionLengthPoint[]
}) {
  const [selected, setSelected] = useState<LengthBody>('Security Council')
  const [hoverYear, setHoverYear] = useState<number | null>(null)

  const series = useMemo(() => {
    const bySeries = new Map<LengthBody, ResolutionLengthPoint[]>()
    for (const { body } of BODIES) bySeries.set(body, [])
    for (const d of data) bySeries.get(d.body)?.push(d)
    for (const pts of bySeries.values()) pts.sort((a, b) => a.year - b.year)
    return bySeries
  }, [data])

  const years = useMemo(
    () => [...new Set(data.map((d) => d.year))].sort((a, b) => a - b),
    [data]
  )

  // Scale to the p75, not the median, so the spread band stays inside the plot.
  const maxValue = useMemo(() => {
    const m = Math.max(10, ...data.map((d) => d.p75Paragraphs))
    return Math.ceil(m / 10) * 10
  }, [data])

  if (years.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No parsed paragraph data available.
      </p>
    )
  }

  const minYear = years[0]
  const maxYear = years[years.length - 1]
  const x = (year: number) =>
    PAD_L +
    ((year - minYear) / Math.max(1, maxYear - minYear)) * (W - PAD_L - PAD_R)
  const y = (value: number) =>
    PAD_T + (1 - value / maxValue) * (H - PAD_T - PAD_B)

  const yStep = maxValue / 5
  const yTicks: number[] = []
  for (let t = 0; t <= maxValue; t += yStep) yTicks.push(t)

  // Label roughly every fifth year, so the axis does not turn into a smear.
  const labelledYears = years.filter(
    (yr) => yr % 5 === 0 || yr === minYear || yr === maxYear
  )

  const path = (pts: ResolutionLengthPoint[], key: 'median' | 'p75') =>
    pts
      .map(
        (p, i) =>
          `${i === 0 ? 'M' : 'L'}${x(p.year)},${y(
            key === 'median' ? p.medianParagraphs : p.p75Paragraphs
          )}`
      )
      .join(' ')

  const hoverPoints =
    hoverYear === null
      ? null
      : BODIES.map(({ body, short }) => ({
          body,
          short,
          point: series.get(body)?.find((p) => p.year === hoverYear),
        })).filter((e) => e.point)

  const selectedPoints = series.get(selected) ?? []

  return (
    <div>
      <p className="mb-3 max-w-3xl text-sm text-gray-500">
        The median number of operative paragraphs in a resolution, per year. The
        median rather than the mean, because a few omnibus texts run to hundreds
        of paragraphs and would drag an average far above anything typical. The
        faint band above the selected line is the upper quartile — the spread a
        median hides.
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
          {hoverYear !== null && hoverPoints ? (
            <span>
              <span className="font-medium text-gray-900">{hoverYear}</span>
              {hoverPoints.map(({ body, short, point }) => (
                <span key={short}>
                  {' · '}
                  {short}{' '}
                  <span
                    className={`font-medium ${
                      body === selected ? 'text-un-blue' : 'text-gray-900'
                    }`}
                  >
                    {point!.medianParagraphs.toFixed(0)}
                  </span>
                  {/* Denominator for the selected organ, so a median is never
                      read without the number of documents behind it. */}
                  {body === selected && (
                    <span className="text-gray-400">
                      {` paras · ${point!.documents.toLocaleString()} docs`}
                    </span>
                  )}
                </span>
              ))}
            </span>
          ) : (
            <span className="text-gray-400">Hover a year for details</span>
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
          aria-label="Median paragraphs per resolution per year for the General Assembly, Security Council and Economic and Social Council"
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
                {t}
              </text>
            </g>
          ))}

          {/* Year x labels */}
          {labelledYears.map((yr) => (
            <text
              key={yr}
              x={x(yr)}
              y={H - 6}
              textAnchor="middle"
              className={`text-[10px] tabular-nums ${
                hoverYear === yr ? 'fill-gray-700' : 'fill-gray-400'
              }`}
            >
              {yr}
            </text>
          ))}

          {/* Upper-quartile line for the selected organ only — context for the
              median, drawn behind everything and never labelled per point. */}
          {selectedPoints.length > 0 && (
            <path
              d={path(selectedPoints, 'p75')}
              fill="none"
              strokeWidth={1}
              strokeDasharray="3 3"
              className="stroke-un-blue/35"
            />
          )}

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
                  d={path(pts, 'median')}
                  fill="none"
                  strokeWidth={active ? 2 : 1.5}
                  className={active ? 'stroke-un-blue' : 'stroke-gray-300'}
                />
                {/* Markers only on the hovered year: one dot per year across
                    ~70 years would read as noise, not data. */}
                {pts
                  .filter((p) => p.year === hoverYear)
                  .map((p) => (
                    <circle
                      key={p.year}
                      cx={x(p.year)}
                      cy={y(p.medianParagraphs)}
                      r={active ? 4 : 3}
                      className={active ? 'fill-un-blue' : 'fill-gray-400'}
                    />
                  ))}
                {/* Direct end label */}
                <text
                  x={x(last.year) + 8}
                  y={y(last.medianParagraphs) + 3}
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
          {years.map((yr, i) => {
            const left = i === 0 ? PAD_L : (x(years[i - 1]) + x(yr)) / 2
            const right =
              i === years.length - 1 ? W - PAD_R : (x(yr) + x(years[i + 1])) / 2
            return (
              <rect
                key={yr}
                x={left}
                y={PAD_T}
                width={right - left}
                height={H - PAD_T - PAD_B}
                fill="transparent"
                onMouseEnter={() => setHoverYear(yr)}
                onMouseLeave={() => setHoverYear(null)}
              />
            )
          })}
        </svg>
      </div>
    </div>
  )
}
