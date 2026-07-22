'use client'

import { useMemo, useState } from 'react'

import { CURRENT_GA_SESSION, type GaSessionVotes } from '@/lib/consensus'

/**
 * "How often does the Assembly vote?" — share of GA resolutions adopted by
 * recorded vote, one bar per regular session (39th, 1984/85 onwards; earlier
 * sessions lack complete vote records in the Digital Library). The current
 * session's bar is provisional and annotated "to date".
 */
export function GaVotingBySession({ data }: { data: GaSessionVotes[] }) {
  const [hover, setHover] = useState<GaSessionVotes | null>(null)

  const gridLines = [25, 50, 75]

  // Decade ticks positioned by session fraction across the axis (session n
  // opens in 1945 + n, so 1985 = session 40, 1995 = 50, …).
  const first = data[0]?.session ?? 0
  const last = data[data.length - 1]?.session ?? 0
  const span = Math.max(1, last - first)
  const decadeTicks = useMemo(() => {
    const ticks: { session: number; year: number }[] = []
    for (let s = Math.ceil(first / 10) * 10; s <= last; s += 10) {
      ticks.push({ session: s, year: 1945 + s })
    }
    return ticks
  }, [first, last])

  if (data.length === 0) return null

  return (
    <div>
      <p className="mb-3 max-w-3xl text-sm text-gray-500">
        Of the resolutions the General Assembly adopts each session, the share
        put to a recorded vote rather than adopted by consensus. Earlier
        sessions are omitted: the Digital Library&apos;s vote records are only
        complete from the 39th session (1984/85) onwards.
      </p>

      {/* Legend + hover readout */}
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-un-blue" />
          Adopted by recorded vote (%)
        </span>
        <span className="ml-auto text-gray-500">
          {hover ? (
            <span>
              <span className="font-medium text-gray-900">
                Session {hover.session} ({hover.startYear}/
                {(hover.startYear + 1) % 100})
              </span>
              {' — '}
              <span className="font-medium text-un-blue">
                {hover.voted.toLocaleString()} of {hover.total.toLocaleString()}{' '}
                resolutions voted (
                {((hover.voted / Math.max(1, hover.total)) * 100).toFixed(0)}
                %)
              </span>
              {hover.session === CURRENT_GA_SESSION && ' · to date'}
            </span>
          ) : (
            <span className="text-gray-400">Hover a session for details</span>
          )}
        </span>
      </div>

      {/* Bars over a % grid */}
      <div className="relative">
        {gridLines.map((g) => (
          <div
            key={g}
            className="pointer-events-none absolute right-0 left-6 border-t border-gray-200"
            style={{ bottom: `${g}%` }}
          >
            <span className="absolute -top-2 -left-6 text-[10px] text-gray-400 tabular-nums">
              {g}%
            </span>
          </div>
        ))}
        <div className="flex h-44 items-end gap-px pl-6">
          {data.map((d) => {
            const pct = (d.voted / Math.max(1, d.total)) * 100
            const isCurrent = d.session === CURRENT_GA_SESSION
            return (
              <div
                key={d.session}
                className="relative flex h-full flex-1 items-end"
                onMouseEnter={() => setHover(d)}
                onMouseLeave={() => setHover(null)}
                title={`Session ${d.session} (${d.startYear}/${(d.startYear + 1) % 100}): ${d.voted} of ${d.total} resolutions adopted by recorded vote (${pct.toFixed(0)}%)${isCurrent ? ' — to date' : ''}`}
              >
                <div
                  className={`absolute bottom-0 w-full rounded-t-[1px] ${
                    isCurrent ? 'bg-un-blue/50' : 'bg-un-blue'
                  }`}
                  style={{ height: `${Math.max(2, pct)}%` }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Session axis (labelled by opening year) */}
      <div className="relative mt-1 h-4 pl-6 text-[10px] text-gray-400">
        <div className="relative h-full">
          {decadeTicks
            .filter((t) => ((t.session - first) / span) * 100 <= 94)
            .map((t) => (
              <span
                key={t.session}
                className="absolute -translate-x-1/2 tabular-nums"
                style={{ left: `${((t.session - first) / span) * 100}%` }}
              >
                {t.year}
              </span>
            ))}
          <span className="absolute right-0 tabular-nums">{1945 + last}</span>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        The {CURRENT_GA_SESSION}th session is still running — its bar (lighter
        blue) covers resolutions adopted to date.
      </p>
    </div>
  )
}
