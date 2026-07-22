'use client'

import { useMemo, useState } from 'react'

interface YearPoint {
  year: number
  count: number
}

/**
 * Reports delivered per year — one un-blue bar per year across the full
 * history of linked reports, in the house year-bar idiom (cf.
 * {@link YearOverlayTrend}). Single series, hover readout in the header row.
 */
export function ReportsLensYearChart({
  reportsPerYear,
  description,
}: {
  /** year (as string) → number of linked reports published that year. */
  reportsPerYear: Record<string, number>
  description: string
}) {
  const [hover, setHover] = useState<YearPoint | null>(null)

  // Dense axis: fill gap years so the time axis stays linear.
  const years = useMemo(() => {
    const entries = Object.entries(reportsPerYear)
      .map(([y, count]) => ({ year: Number(y), count }))
      .filter((d) => Number.isFinite(d.year))
      .sort((a, b) => a.year - b.year)
    if (entries.length === 0) return [] as YearPoint[]
    const byYear = new Map(entries.map((d) => [d.year, d.count]))
    const min = entries[0].year
    const max = entries[entries.length - 1].year
    const out: YearPoint[] = []
    for (let y = min; y <= max; y++) {
      out.push({ year: y, count: byYear.get(y) ?? 0 })
    }
    return out
  }, [reportsPerYear])

  const maxCount = useMemo(
    () => Math.max(1, ...years.map((d) => d.count)),
    [years]
  )

  if (years.length === 0) return null

  const axisMin = years[0].year
  const axisMax = years[years.length - 1].year
  const span = Math.max(1, axisMax - axisMin)
  const pct = (year: number) => ((year - axisMin) / span) * 100

  const decades: number[] = []
  for (let y = Math.ceil(axisMin / 10) * 10; y <= axisMax - 4; y += 10)
    decades.push(y)

  return (
    <div>
      <p className="mb-3 max-w-3xl text-sm text-gray-500">{description}</p>

      {/* Hover readout */}
      <div className="mb-2 flex items-center text-[11px] text-gray-600">
        <span className="ml-auto">
          {hover ? (
            <span>
              <span className="font-medium text-gray-900">{hover.year}</span>
              {' — '}
              <span className="font-medium text-un-blue">
                {hover.count.toLocaleString()}
              </span>
              {' linked reports'}
            </span>
          ) : (
            <span className="text-gray-400">Hover a year for details</span>
          )}
        </span>
      </div>

      {/* Bars */}
      <div className="flex h-40 items-end gap-px">
        {years.map((d) => {
          const h = d.count > 0 ? Math.max(2, (d.count / maxCount) * 100) : 0
          return (
            <div
              key={d.year}
              className="relative flex h-full flex-1 items-end"
              onMouseEnter={() => setHover(d)}
              onMouseLeave={() => setHover(null)}
              title={`${d.year}: ${d.count.toLocaleString()} linked reports`}
            >
              {d.count > 0 ? (
                <div
                  className="w-full rounded-[1px] bg-un-blue/70 transition-colors hover:bg-un-blue"
                  style={{ height: `${h}%` }}
                />
              ) : (
                <div className="h-px w-full bg-muted-foreground/20" />
              )}
            </div>
          )
        })}
      </div>

      {/* Decade axis */}
      <div className="relative mt-1 h-4 text-[10px] text-gray-400">
        {decades.map((y) => (
          <span
            key={y}
            className="absolute -translate-x-1/2 tabular-nums"
            style={{ left: `${pct(y)}%` }}
          >
            {y}
          </span>
        ))}
        <span className="absolute right-0 tabular-nums">{axisMax}</span>
      </div>
    </div>
  )
}
