'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  HeartbeatChainRow,
  HeartbeatData,
  ScRenewal,
} from '@/lib/sc-renewals'

const AXIS_MIN = Date.UTC(1990, 0, 1)

/** Leash buckets: how long the Council let a mandate run before review. */
const BUCKETS = [
  {
    id: 'short',
    max: 100,
    label: '≤ 3 months (technical rollover)',
    color: 'var(--color-tier-1)',
  },
  {
    id: 'mid',
    max: 250,
    label: '≈ 6 months',
    color: 'var(--color-tier-2)',
  },
  {
    id: 'long',
    max: Infinity,
    label: '≈ 1 year or longer',
    color: 'var(--color-un-blue)',
  },
] as const

function bucketColor(leashDays: number): string {
  for (const b of BUCKETS) if (leashDays <= b.max) return b.color
  return BUCKETS[BUCKETS.length - 1].color
}

function ts(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`)
}

function mandateUrl(symbol: string): string {
  return `/mandate/${symbol
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/')}`
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

interface Hover {
  chain: HeartbeatChainRow
  renewal: ScRenewal
}

/**
 * "Mandate heartbeat" — one row per Security Council mission / sanctions
 * regime / standing authorization, each renewal drawn as a segment from its
 * adoption date to the expiry date it sets, coloured by leash length. Active
 * chains are sorted shortest-current-leash-first so mandates on technical
 * rollovers surface at the top. Clicking a segment opens the resolution's
 * mandate page.
 */
export function MandateHeartbeat({ data }: { data: HeartbeatData }) {
  const [showEnded, setShowEnded] = useState(false)
  const [hover, setHover] = useState<Hover | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // On narrow screens the timeline overflows; start scrolled to the recent
  // era (current leashes) rather than the 1990s.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])

  const axisMax = useMemo(() => {
    let max = ts(data.generated)
    for (const row of [...data.active, ...data.ended]) {
      max = Math.max(max, ts(row.lastUntil))
    }
    return max
  }, [data])

  const span = axisMax - AXIS_MIN
  const pct = (isoOrTs: string | number) =>
    (((typeof isoOrTs === 'number' ? isoOrTs : ts(isoOrTs)) - AXIS_MIN) /
      span) *
    100

  const decades = useMemo(() => {
    const out: number[] = []
    const maxYear = new Date(axisMax).getUTCFullYear()
    for (let y = 1990; y <= maxYear; y += 5) out.push(y)
    return out
  }, [axisMax])

  const rows = showEnded ? [...data.active, ...data.ended] : data.active

  // Median-trend geometry (SVG viewBox 0..100 x 0..40, y = leash days).
  const TREND_MAX_DAYS = 480
  const trendPoints = useMemo(
    () =>
      data.medianTrend.map((p) => ({
        ...p,
        x: pct(Date.UTC(p.year, 6, 1)),
        y: 40 - Math.min(40, (p.medianDays / TREND_MAX_DAYS) * 40),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.medianTrend, span]
  )
  const [trendHover, setTrendHover] = useState<
    (typeof trendPoints)[number] | null
  >(null)

  const gridY = (days: number) => 40 - (days / TREND_MAX_DAYS) * 40

  return (
    <div>
      <p className="mb-3 max-w-3xl text-sm text-gray-500">
        Every time the Security Council extends a mission, a sanctions regime or
        a standing authorization, it sets an expiry date — a leash. Short
        leashes mean the Council is keeping a mandate on close watch (or can
        agree on nothing more than a technical rollover); year-long leashes
        signal routine. Extracted from {data.renewalCount.toLocaleString()}{' '}
        renewal clauses in Security Council resolutions since 1990.
      </p>

      {/* ---- Median leash trend ------------------------------------------ */}
      <h4 className="mb-1 text-sm font-semibold text-gray-900">
        The typical leash has doubled: from six months to a year
      </h4>
      <p className="mb-2 max-w-3xl text-xs text-gray-500">
        Median leash of all renewals adopted each year.
        <span className="ml-2 text-gray-500">
          {trendHover ? (
            <span>
              <span className="font-medium text-gray-900">
                {trendHover.year}
              </span>
              {' — median '}
              <span className="font-medium text-un-blue">
                {trendHover.medianDays} days
              </span>
              {` across ${trendHover.count} renewals`}
            </span>
          ) : (
            <span className="text-gray-400">Hover for yearly values</span>
          )}
        </span>
      </p>
      <div className="mb-1">
        <svg
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          className="h-20 w-full"
          role="img"
          aria-label="Median leash length of Security Council renewals per year, 1990 to today"
        >
          {/* semantic gridlines at 3 months, 6 months, 1 year */}
          {[91, 182, 365].map((days) => (
            <line
              key={days}
              x1="0"
              x2="100"
              y1={gridY(days)}
              y2={gridY(days)}
              stroke="var(--color-geyser)"
              strokeWidth="0.4"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <polyline
            points={trendPoints.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="var(--color-un-blue)"
            strokeWidth="1.75"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {trendHover && (
            <circle
              cx={trendHover.x}
              cy={trendHover.y}
              r="1.2"
              fill="var(--color-un-blue)"
            />
          )}
          {/* invisible hover columns */}
          {trendPoints.map((p, i) => {
            const prev = i > 0 ? trendPoints[i - 1] : p
            const next = i < trendPoints.length - 1 ? trendPoints[i + 1] : p
            const x0 = (prev.x + p.x) / 2
            const x1 = (p.x + next.x) / 2
            return (
              <rect
                key={p.year}
                x={x0}
                y="0"
                width={Math.max(0.5, x1 - x0)}
                height="40"
                fill="transparent"
                onMouseEnter={() => setTrendHover(p)}
                onMouseLeave={() => setTrendHover(null)}
              />
            )
          })}
        </svg>
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>Gridlines: 3 months · 6 months · 1 year</span>
        </div>
      </div>

      {/* ---- Heartbeat --------------------------------------------------- */}
      <h4 className="mt-8 mb-1 text-sm font-semibold text-gray-900">
        Mandates on the shortest leash float to the top
      </h4>
      <p className="mb-3 max-w-3xl text-xs text-gray-500">
        One row per mission or regime; each segment is one renewal, from
        adoption to the expiry date it sets. Active mandates are sorted by their
        current leash — the ones the Council reviews most often come first.
        Click a segment to open the resolution.
      </p>

      {/* Legend + hover status */}
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-gray-600">
        {BUCKETS.map((b) => (
          <span key={b.id} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: b.color }}
            />
            {b.label}
          </span>
        ))}
      </div>
      <div className="mb-2 h-5 truncate text-xs text-gray-600">
        {hover ? (
          <span>
            <span className="font-medium text-gray-900">
              {hover.chain.label}
            </span>
            {' — '}
            <span className="font-medium text-un-blue">
              {hover.renewal.symbol}
            </span>
            {`: ${formatDate(hover.renewal.adopted)} → ${formatDate(hover.renewal.until)} · `}
            <span className="font-medium text-gray-900">
              {hover.renewal.leash_days} days
            </span>
          </span>
        ) : (
          <span className="text-gray-400">
            Hover a segment for the resolution behind it
          </span>
        )}
      </div>

      <div ref={scrollRef} className="overflow-x-auto pb-2">
        <div className="min-w-[560px]">
          {/* Decade axis (top) */}
          <div className="flex">
            <div className="sticky left-0 z-[1] w-36 shrink-0 bg-background sm:w-52" />
            <div className="relative h-4 flex-1 text-[10px] text-gray-400">
              {decades.map((y, i) => (
                <span
                  key={y}
                  className={`absolute tabular-nums ${i === 0 ? '' : '-translate-x-1/2'}`}
                  style={{ left: `${pct(Date.UTC(y, 0, 1))}%` }}
                >
                  {y}
                </span>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div>
            {rows.map((chain) => (
              <div
                key={chain.id}
                className="group flex items-center hover:bg-un-blue/5"
              >
                <div
                  className="sticky left-0 z-[1] w-36 shrink-0 truncate bg-background pr-2 text-[11px] leading-[18px] text-gray-700 sm:w-52"
                  title={chain.label}
                >
                  {chain.label}
                  {!chain.active && (
                    <span className="ml-1 text-gray-400">(ended)</span>
                  )}
                </div>
                <div className="relative h-[18px] flex-1">
                  <div className="absolute top-1/2 right-0 left-0 h-px bg-gray-100" />
                  {/* "now" marker */}
                  <div
                    className="pointer-events-none absolute top-0 bottom-0 border-l border-dashed border-gray-300"
                    style={{ left: `${pct(data.generated)}%` }}
                    aria-hidden
                  />
                  {chain.renewals.map((r) => {
                    const left = Math.max(0, pct(r.adopted))
                    const right = Math.min(100, pct(r.until))
                    if (right <= 0) return null
                    return (
                      <Link
                        key={`${r.symbol}-${r.until}`}
                        href={mandateUrl(r.symbol)}
                        scroll={false}
                        onMouseEnter={() => setHover({ chain, renewal: r })}
                        onMouseLeave={() => setHover(null)}
                        title={`${r.symbol}: ${formatDate(r.adopted)} → ${formatDate(r.until)} (${r.leash_days} days)`}
                        className="absolute top-[3px] block h-3 rounded-[1px]"
                        style={{
                          left: `${left}%`,
                          width: `max(2px, ${right - left}%)`,
                          backgroundColor: bucketColor(r.leash_days),
                          opacity: chain.active ? 1 : 0.55,
                          boxShadow: '-1px 0 0 var(--color-background)',
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowEnded((v) => !v)}
        className="mt-2 text-xs text-un-blue hover:text-un-blue/80"
      >
        {showEnded
          ? 'Hide ended missions and regimes'
          : `Show ${data.ended.length} ended missions and regimes`}
      </button>

      <p className="mt-4 max-w-3xl text-[11px] leading-relaxed text-gray-400">
        Source: operative paragraphs of Security Council resolutions (S/RES/…),
        UN Digital Library texts; extension clauses parsed by pattern
        (&ldquo;extends/renews … until &lt;date&gt;&rdquo; and equivalents),
        grouped into {data.active.length + data.ended.length} renewal chains.
        Open-ended mandates (e.g. UNTSO, UNMOGIP, UNMIK after 1999) never appear
        because they have no expiry to extend. Dashed line marks the data
        cut-off ({formatDate(data.generated)}).
      </p>
    </div>
  )
}
