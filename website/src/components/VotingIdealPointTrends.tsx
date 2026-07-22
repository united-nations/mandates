'use client'

import { useMemo, useState } from 'react'

import type { VotingAnalysis } from '@/lib/data/country-votes'

/**
 * Long-run geopolitical alignment chart: every UN member's Bailey-Strezhnev-
 * Voeten ideal point (estimated from GA roll-call votes, 1946-2025), shown as
 * a grey distribution band (10th-90th and 25th-75th percentiles + median)
 * with a handful of labeled country trajectories on top. Higher = votes more
 * with the US-led side; lower = against it.
 *
 * Deliberately NOT 193 lines: the band carries the membership, the labeled
 * lines carry the story (US drifting up-and-away from the pack, China/Russia
 * at the bottom, Ukraine's post-2014 jump, …). Text stays in text colours;
 * the line colours only distinguish neighbours.
 */

// Fixed categorical assignment (never cycled), 7 series maximum. The hex
// sequence in vertical label order (USA, ISR, GBR, UKR, RUS, IND, CHN as of
// 2025) passes all six palette checks on the light surface (chroma-nudged
// indigo #5052a5 and rose #a84f70 replace the sub-floor muted originals);
// the one CVD warn (CHN red vs IND green, ΔE 6.0 deutan) is covered by the
// direct label every line carries at its right end.
const SERIES_COLORS: Record<string, string> = {
  USA: '#0090cc', // un-blue-deep
  ISR: '#c9820f', // tier-2 amber
  GBR: '#2aa392', // tier-3 teal
  UKR: '#5052a5', // indigo (chroma-raised indigo-muted)
  RUS: '#a84f70', // rose (chroma-raised dusty-rose)
  IND: '#276b35', // tier-4 green
  CHN: '#ab3a2c', // tier-1 red
}

// Compact display names for the right-edge labels (the registry names are
// formal and too long for the 88px label gutter).
const SHORT_NAMES: Record<string, string> = {
  USA: 'United States',
  GBR: 'United Kingdom',
  RUS: 'Russia',
}

const W = 760
const H = 300
const PAD = { top: 10, right: 88, bottom: 22, left: 34 }

export function VotingIdealPointTrends({
  analysis,
}: {
  analysis: VotingAnalysis
}) {
  const { years, percentiles, series } = analysis.idealPoints
  const { countries } = analysis
  const [hoverYear, setHoverYear] = useState<number | null>(null)

  const isoList = Object.keys(series).filter((iso) => SERIES_COLORS[iso])

  const domain = useMemo(() => {
    let min = Infinity
    let max = -Infinity
    for (const v of [...percentiles.p10, ...percentiles.p90]) {
      min = Math.min(min, v)
      max = Math.max(max, v)
    }
    for (const iso of isoList) {
      for (const v of series[iso]) {
        if (v !== null) {
          min = Math.min(min, v)
          max = Math.max(max, v)
        }
      }
    }
    return { min: Math.floor(min * 2) / 2, max: Math.ceil(max * 2) / 2 }
  }, [percentiles, series, isoList])

  const x = (year: number) =>
    PAD.left +
    ((year - years[0]) / (years[years.length - 1] - years[0])) *
      (W - PAD.left - PAD.right)
  const y = (v: number) =>
    PAD.top +
    (1 - (v - domain.min) / (domain.max - domain.min)) *
      (H - PAD.top - PAD.bottom)

  const bandPath = (upper: number[], lower: number[]) => {
    const up = years.map(
      (yr, i) => `${x(yr).toFixed(1)},${y(upper[i]).toFixed(1)}`
    )
    const down = [...years].reverse().map((yr, i) => {
      const v = lower[years.length - 1 - i]
      return `${x(yr).toFixed(1)},${y(v).toFixed(1)}`
    })
    return `M${up.join('L')}L${down.join('L')}Z`
  }

  const linePath = (vals: (number | null)[]) => {
    let d = ''
    let pen = false
    years.forEach((yr, i) => {
      const v = vals[i]
      if (v === null) {
        pen = false
        return
      }
      d += `${pen ? 'L' : 'M'}${x(yr).toFixed(1)},${y(v).toFixed(1)}`
      pen = true
    })
    return d
  }

  // Label positions at the right edge, nudged apart so they never overlap.
  const labels = useMemo(() => {
    const items = isoList
      .map((iso) => {
        const vals = series[iso]
        let last: number | null = null
        for (let i = vals.length - 1; i >= 0; i--) {
          if (vals[i] !== null) {
            last = vals[i]
            break
          }
        }
        return last === null ? null : { iso, yPos: y(last) }
      })
      .filter((d): d is { iso: string; yPos: number } => d !== null)
      .sort((a, b) => a.yPos - b.yPos)
    const MIN_GAP = 13
    for (let i = 1; i < items.length; i++) {
      if (items[i].yPos - items[i - 1].yPos < MIN_GAP) {
        items[i].yPos = items[i - 1].yPos + MIN_GAP
      }
    }
    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isoList, series, domain])

  const hoverIdx = hoverYear === null ? -1 : years.indexOf(hoverYear)

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const fx = ((e.clientX - rect.left) / rect.width) * W
    const yr = Math.round(
      years[0] +
        ((fx - PAD.left) / (W - PAD.left - PAD.right)) *
          (years[years.length - 1] - years[0])
    )
    setHoverYear(Math.max(years[0], Math.min(years[years.length - 1], yr)))
  }

  const decadeTicks = years.filter((yr) => yr % 10 === 0)

  return (
    <div>
      <p className="mb-3 max-w-3xl text-sm text-gray-500">
        Each country&apos;s estimated position on the main geopolitical axis of
        General Assembly voting, 1946–2025 (Bailey–Strezhnev–Voeten ideal
        points; higher = votes more often with the United States). The grey band
        holds the middle 80% of all members, the darker band the middle 50%, the
        dashed line the median. A few countries are drawn on top.
      </p>

      <div className="mb-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-gray-200" />
          middle 80% of members
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-gray-300" />
          middle 50%
        </span>
        <span className="ml-auto text-gray-500">
          {hoverYear !== null && hoverIdx >= 0 ? (
            <span>
              <span className="font-medium text-gray-900">{hoverYear}</span>
              {' — median '}
              <span className="font-medium text-gray-900">
                {percentiles.p50[hoverIdx].toFixed(2)}
              </span>
              {', US '}
              <span className="font-medium text-un-blue">
                {series.USA?.[hoverIdx]?.toFixed(2) ?? '—'}
              </span>
            </span>
          ) : (
            <span className="text-gray-400">Hover for yearly values</span>
          )}
        </span>
      </div>

      {/* On narrow screens the fixed viewBox would shrink labels below
          legibility, so the chart keeps a minimum width and scrolls inside
          its own container instead. */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[620px]"
          onMouseMove={onMove}
          onMouseLeave={() => setHoverYear(null)}
          role="img"
          aria-label="Ideal point trajectories of UN members, 1946 to 2025"
        >
          {/* zero line */}
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(0)}
            y2={y(0)}
            stroke="#d1d5db"
            strokeDasharray="2 3"
          />
          <text
            x={PAD.left - 6}
            y={y(0) + 3}
            textAnchor="end"
            className="fill-gray-400 text-[9px] tabular-nums"
          >
            0
          </text>
          {[domain.min, domain.max].map((v) => (
            <text
              key={v}
              x={PAD.left - 6}
              y={y(v) + 3}
              textAnchor="end"
              className="fill-gray-400 text-[9px] tabular-nums"
            >
              {v}
            </text>
          ))}

          {/* distribution bands + median */}
          <path d={bandPath(percentiles.p90, percentiles.p10)} fill="#e5e7eb" />
          <path d={bandPath(percentiles.p75, percentiles.p25)} fill="#d1d5db" />
          <path
            d={linePath(percentiles.p50)}
            fill="none"
            stroke="#6b7280"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* labeled country lines */}
          {isoList.map((iso) => (
            <path
              key={iso}
              d={linePath(series[iso])}
              fill="none"
              stroke={SERIES_COLORS[iso]}
              strokeWidth="1.6"
            />
          ))}

          {/* right-edge labels in text colour with a colour tick */}
          {labels.map(({ iso, yPos }) => (
            <g key={iso}>
              <line
                x1={W - PAD.right + 2}
                x2={W - PAD.right + 10}
                y1={yPos}
                y2={yPos}
                stroke={SERIES_COLORS[iso]}
                strokeWidth="2"
              />
              <text
                x={W - PAD.right + 13}
                y={yPos + 3}
                className="fill-gray-700 text-[10px]"
              >
                {SHORT_NAMES[iso] ?? countries[iso] ?? iso}
              </text>
            </g>
          ))}

          {/* hover rule */}
          {hoverYear !== null && (
            <line
              x1={x(hoverYear)}
              x2={x(hoverYear)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="#9ca3af"
              strokeWidth="0.8"
            />
          )}

          {/* decade axis */}
          {decadeTicks.map((yr) => (
            <text
              key={yr}
              x={x(yr)}
              y={H - 8}
              textAnchor="middle"
              className="fill-gray-400 text-[9px] tabular-nums"
            >
              {yr}
            </text>
          ))}
        </svg>
      </div>
    </div>
  )
}
