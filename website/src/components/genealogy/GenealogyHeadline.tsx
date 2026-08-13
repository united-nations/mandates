'use client'

import { useState } from 'react'

import type { HeadlineByAge, HeadlineByDecade } from '@/lib/genealogy'

/**
 * Headline chart for the Boilerplate Genealogy lens.
 *
 * The job is change-over-time of a part-to-whole: as a renewal chain ages, how
 * much of each new resolution is text carried over (verbatim / mutated) versus
 * genuinely new. A stacked area answers it directly — the dark "verbatim" base
 * grows renewal by renewal while the pale "new" band shrinks.
 *
 * Colour is a single sequential blue family (verbatim darkest → mutated light)
 * with a neutral for new; see the `--color-geneal-*` tokens in globals.css.
 */

const V = 'var(--color-geneal-verbatim)'
const M = 'var(--color-geneal-mutated)'
const N = 'var(--color-geneal-new)'

type Mode = 'age' | 'decade'

interface Row {
  label: string
  sub: string
  v: number
  m: number
  n: number
  count: number
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-[2px]"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-gray-600">{label}</span>
    </span>
  )
}

export function GenealogyHeadline({
  byAge,
  byDecade,
}: {
  byAge: HeadlineByAge[]
  byDecade: HeadlineByDecade[]
}) {
  const [mode, setMode] = useState<Mode>('age')
  const [hover, setHover] = useState<number | null>(null)

  // Cap the by-age view at renewals where at least ~20 chains still contribute,
  // so the tail (a handful of very long chains) can't wobble the trend line.
  const ageRows: Row[] = byAge
    .filter((d) => d.nChains >= 20)
    .map((d) => ({
      label: `${d.age}`,
      sub: `${d.nChains} chains`,
      v: d.verbatimPct,
      m: d.mutatedPct,
      n: d.newPct,
      count: d.nChains,
    }))

  const decadeRows: Row[] = byDecade.map((d) => ({
    label: `${String(d.decade).slice(2)}s`,
    sub: `${d.nRenewals} renewals`,
    v: d.verbatimPct,
    m: d.mutatedPct,
    n: d.newPct,
    count: d.nRenewals,
  }))

  const rows = mode === 'age' ? ageRows : decadeRows

  // geometry
  const W = 720
  const H = 300
  const padL = 40
  const padR = 12
  const padT = 12
  const padB = 44
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const n = rows.length
  const bandW = plotW / n
  const x = (i: number) => padL + i * bandW + bandW / 2
  const y = (pct: number) => padT + plotH * (1 - pct / 100)

  // build stacked polygons: bottom→top = verbatim, mutated, new
  const topV = rows.map((r) => r.v)
  const topVM = rows.map((r) => r.v + r.m)

  function areaPath(lower: number[], upper: number[]): string {
    const up = upper.map((val, i) => `${x(i)},${y(val)}`)
    const lo = lower.map((val, i) => `${x(i)},${y(val)}`).reverse()
    return `M${up.join(' L')} L${lo.join(' L')} Z`
  }

  const zero = rows.map(() => 0)
  const hundred = rows.map(() => 100)

  const gridlines = [0, 25, 50, 75, 100]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-md bg-gray-100 p-0.5 text-xs">
          <button
            onClick={() => setMode('age')}
            className={`rounded px-2.5 py-1 font-medium transition ${
              mode === 'age'
                ? 'bg-white text-un-blue shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            By renewal number
          </button>
          <button
            onClick={() => setMode('decade')}
            className={`rounded px-2.5 py-1 font-medium transition ${
              mode === 'decade'
                ? 'bg-white text-un-blue shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            By decade adopted
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <LegendSwatch color={V} label="Verbatim (copy-paste)" />
          <LegendSwatch color={M} label="Mutated" />
          <LegendSwatch color={N} label="New text" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full min-w-[560px]"
          role="img"
          aria-label={
            mode === 'age'
              ? 'Share of each resolution that is verbatim, mutated, or new, by renewal number'
              : 'Share of each resolution that is verbatim, mutated, or new, by decade'
          }
          onMouseLeave={() => setHover(null)}
        >
          {/* gridlines + y labels */}
          {gridlines.map((g) => (
            <g key={g}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y(g)}
                y2={y(g)}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <text
                x={padL - 6}
                y={y(g) + 3}
                textAnchor="end"
                className="fill-gray-400"
                fontSize={10}
              >
                {g}%
              </text>
            </g>
          ))}

          {/* stacked areas (bottom → top): verbatim, mutated, new */}
          <path d={areaPath(zero, topV)} fill={V} />
          <path d={areaPath(topV, topVM)} fill={M} />
          <path d={areaPath(topVM, hundred)} fill={N} />

          {/* 2px surface gaps between bands */}
          <polyline
            points={rows.map((_, i) => `${x(i)},${y(topV[i])}`).join(' ')}
            fill="none"
            stroke="white"
            strokeWidth={2}
          />
          <polyline
            points={rows.map((_, i) => `${x(i)},${y(topVM[i])}`).join(' ')}
            fill="none"
            stroke="white"
            strokeWidth={2}
          />

          {/* hover targets + crosshair */}
          {rows.map((r, i) => (
            <rect
              key={i}
              x={padL + i * bandW}
              y={padT}
              width={bandW}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
          {hover !== null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={padT}
              y2={padT + plotH}
              stroke="#143c52"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.5}
            />
          )}

          {/* x labels (thinned when crowded) */}
          {rows.map((r, i) => {
            const every = n > 24 ? 4 : n > 14 ? 2 : 1
            if (i % every !== 0 && i !== n - 1) return null
            return (
              <text
                key={i}
                x={x(i)}
                y={H - padB + 16}
                textAnchor="middle"
                className="fill-gray-500"
                fontSize={10}
              >
                {r.label}
              </text>
            )
          })}
          <text x={padL} y={H - 6} className="fill-gray-400" fontSize={10}>
            {mode === 'age'
              ? 'Renewal number (1 = first re-adoption) →'
              : 'Decade the resolution was adopted →'}
          </text>
        </svg>
      </div>

      {/* hover readout */}
      <div className="mt-2 min-h-[2.5rem] text-xs">
        {hover !== null && rows[hover] ? (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-semibold text-gray-900">
              {mode === 'age'
                ? `Renewal ${rows[hover].label}`
                : `${rows[hover].label.replace(/s$/, '')}0s`}
            </span>
            <span style={{ color: V }} className="font-medium">
              {rows[hover].v}% verbatim
            </span>
            <span className="font-medium text-gray-600">
              {rows[hover].m}% mutated
            </span>
            <span className="text-gray-500">{rows[hover].n}% new</span>
            <span className="text-gray-400">
              {rows[hover].v + rows[hover].m}% carried over · {rows[hover].sub}
            </span>
          </div>
        ) : (
          <span className="text-gray-400">
            Hover the chart for the exact split at each{' '}
            {mode === 'age' ? 'renewal' : 'decade'}.
          </span>
        )}
      </div>
    </div>
  )
}
