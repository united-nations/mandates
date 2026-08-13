'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import {
  activeInYear,
  projectPoint,
  strengthInYear,
  type MapMission,
  type MissionMapData,
} from '@/lib/mission-map'

/**
 * Where the peace operations are, and when. A dependency-free equirectangular SVG
 * map (land outline pre-projected at build time) with a year scrubber: markers are
 * the missions active in the selected year, sized by deployed uniformed strength
 * and coloured by whether the mission is still open today or since closed.
 */

const OPEN_COLOR = 'var(--color-un-blue)'
const CLOSED_COLOR = 'var(--color-trout)'

// sqrt area scale: radius ~ sqrt(strength)
function radius(strength: number): number {
  if (strength <= 0) return 3
  return Math.min(3 + Math.sqrt(strength) * 0.14, 24)
}

const nf = new Intl.NumberFormat('en-US')

interface HoverState {
  m: MapMission
  strength: number
  x: number
  y: number
}

export function MissionMap({ data }: { data: MissionMapData }) {
  const { projection: p, missions } = data
  const [year, setYear] = useState(data.maxYear)
  const [playing, setPlaying] = useState(false)
  const [hover, setHover] = useState<HoverState | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!playing) return
    timer.current = setInterval(() => {
      setYear((y) => {
        if (y >= data.maxYear) return data.minYear
        return y + 1
      })
    }, 700)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [playing, data.minYear, data.maxYear])

  const active = useMemo(
    () =>
      missions
        .map((m) => ({ m, strength: strengthInYear(m, year) }))
        .filter(({ m }) => activeInYear(m, year))
        // draw the biggest first so small markers sit on top
        .sort((a, b) => b.strength - a.strength),
    [missions, year]
  )

  const totalDeployed = active.reduce((s, a) => s + a.strength, 0)
  const openCount = active.filter((a) => a.m.open).length

  return (
    <div>
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() => setPlaying((v) => !v)}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-un-blue hover:bg-un-blue/5"
          aria-label={playing ? 'Pause timeline' : 'Play timeline'}
        >
          {playing ? (
            <span className="text-xs">❚❚</span>
          ) : (
            <span className="ml-0.5 text-[10px]">▶</span>
          )}
        </button>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900 tabular-nums">
            {year}
          </span>
          <span className="text-xs text-gray-500">
            {openCount + (active.length - openCount) > 0
              ? `${active.length} missions active · ${nf.format(totalDeployed)} uniformed deployed`
              : 'no missions active'}
          </span>
        </div>
        <input
          type="range"
          min={data.minYear}
          max={data.maxYear}
          value={year}
          onChange={(e) => {
            setPlaying(false)
            setYear(Number(e.target.value))
          }}
          className="mt-1 h-1 w-full min-w-40 flex-1 cursor-pointer accent-un-blue"
          aria-label="Select year"
        />
      </div>

      {/* Map */}
      <div className="relative w-full overflow-hidden rounded-md border border-border bg-muted/30">
        <svg
          viewBox={`0 0 ${p.w} ${p.h}`}
          width="100%"
          className="block h-auto w-full"
          role="img"
          aria-label={`Map of UN peace operations active in ${year}`}
          onMouseLeave={() => setHover(null)}
        >
          {/* land */}
          <path
            d={data.land}
            fill="var(--color-geyser)"
            stroke="var(--color-background)"
            strokeWidth={0.4}
            opacity={0.55}
          />
          {/* markers */}
          {active.map(({ m, strength }) => {
            const { x, y } = projectPoint(m.lon, m.lat, p)
            const r = radius(strength)
            const color = m.open ? OPEN_COLOR : CLOSED_COLOR
            return (
              <g key={m.acronym}>
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={color}
                  fillOpacity={strength > 0 ? 0.35 : 0.12}
                  stroke={color}
                  strokeWidth={1.25}
                  className="cursor-pointer"
                  onMouseEnter={() => setHover({ m, strength, x, y })}
                  onMouseLeave={() => setHover(null)}
                />
                {r >= 9 && (
                  <text
                    x={x}
                    y={y + 3}
                    textAnchor="middle"
                    className="pointer-events-none fill-gray-900 font-semibold"
                    style={{
                      fontSize: 8,
                      paintOrder: 'stroke',
                      stroke: 'var(--color-background)',
                      strokeWidth: 2,
                      strokeLinejoin: 'round',
                    }}
                  >
                    {m.acronym}
                  </text>
                )}
              </g>
            )
          })}
          {/* hover halo + label */}
          {hover && (
            <g className="pointer-events-none">
              <circle
                cx={hover.x}
                cy={hover.y}
                r={radius(hover.strength) + 2.5}
                fill="none"
                stroke="var(--color-un-blue-deep)"
                strokeWidth={1}
              />
            </g>
          )}
        </svg>

        {/* Tooltip */}
        {hover && (
          <div
            className="pointer-events-none absolute z-10 max-w-56 rounded-md border border-border bg-background/95 px-2.5 py-1.5 text-xs shadow-sm backdrop-blur-sm"
            style={{
              left: `${(hover.x / p.w) * 100}%`,
              top: `${(hover.y / p.h) * 100}%`,
              transform: 'translate(-50%, calc(-100% - 10px))',
            }}
          >
            <div className="font-semibold text-gray-900">
              {hover.m.acronym}
              <span className="ml-1 font-normal text-gray-500">
                {hover.m.open ? 'open' : 'closed'}
              </span>
            </div>
            <div className="text-gray-500">{hover.m.location}</div>
            <div className="mt-0.5 text-gray-700">
              {hover.strength > 0
                ? `${nf.format(hover.strength)} uniformed deployed (${year})`
                : 'no uniformed personnel reported'}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: OPEN_COLOR, opacity: 0.5 }}
          />
          still open today
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: CLOSED_COLOR, opacity: 0.5 }}
          />
          since closed
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-flex items-end gap-1">
            {[1000, 5000, 15000].map((s) => (
              <span
                key={s}
                className="inline-block rounded-full bg-gray-400/40 outline-1 outline-gray-400"
                style={{
                  width: radius(s) * 1.4,
                  height: radius(s) * 1.4,
                }}
              />
            ))}
          </span>
          marker size ∝ uniformed deployed (1k · 5k · 15k)
        </span>
      </div>
    </div>
  )
}
