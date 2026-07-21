'use client'

import { useMemo, useState } from 'react'

import { useFilters } from '@/contexts/FilterContext'

const AXIS_MIN = 1946

export interface YearOverlayPoint {
  year: number
  /** Background (grey) series — always the larger, enclosing quantity. */
  total: number
  /** Foreground (un-blue) series — a subset of `total`. */
  highlight: number
}

/**
 * Shared year-by-year overlay bar chart for the /secretariat "Trends over time"
 * expander. One bar per year across the full catalog history, with two series
 * on a shared scale: a grey background bar for the total and a shorter un-blue
 * foreground bar for the highlighted subset, which therefore always sits inside
 * its grey bar.
 *
 * Clicking a year sets the year filter (start_year = end_year) and scrolls to
 * the mandate list; clicking the already-selected year clears it. The selected
 * year's bar is emphasised, derived from the active URL filter.
 */
export function YearOverlayTrend({
  data,
  description,
  totalLabel,
  highlightLabel,
  totalHoverLabel,
  highlightHoverLabel,
}: {
  data: YearOverlayPoint[]
  description: string
  /** Legend text for the grey series. */
  totalLabel: string
  /** Legend text for the un-blue series. */
  highlightLabel: string
  /** Short word after the count in the hover readout, e.g. "adopted". */
  totalHoverLabel: string
  /** Short word after the count in the hover readout, e.g. "cited". */
  highlightHoverLabel: string
}) {
  const { filters, setMultipleFilters } = useFilters()
  const [hover, setHover] = useState<YearOverlayPoint | null>(null)

  // Dense full-range axis: fill any gap years so the time axis stays linear
  // even where a year has no documents.
  const years = useMemo(() => {
    if (data.length === 0) return [] as YearOverlayPoint[]
    const byYear = new Map(data.map((d) => [d.year, d]))
    const min = Math.min(AXIS_MIN, data[0].year)
    const max = data[data.length - 1].year
    const out: YearOverlayPoint[] = []
    for (let y = min; y <= max; y++) {
      out.push(byYear.get(y) ?? { year: y, total: 0, highlight: 0 })
    }
    return out
  }, [data])

  const maxCount = useMemo(
    () => Math.max(1, ...years.map((y) => y.total)),
    [years]
  )

  const axisMin = years.length ? years[0].year : AXIS_MIN
  const axisMax = years.length ? years[years.length - 1].year : AXIS_MIN

  // The single selected year (start_year === end_year), if any.
  const selectedYear =
    filters.start_year && filters.start_year === filters.end_year
      ? parseInt(filters.start_year)
      : null

  function selectYear(year: number) {
    const y = year.toString()
    const isSame = filters.start_year === y && filters.end_year === y
    setMultipleFilters({
      start_year: isSame ? undefined : y,
      end_year: isSame ? undefined : y,
      page: undefined,
    })
    if (!isSame) {
      document
        .getElementById('mandates')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Decade tick labels, positioned by year fraction across the axis.
  const decades = useMemo(() => {
    const ticks: number[] = []
    for (let y = Math.ceil(axisMin / 10) * 10; y <= axisMax; y += 10)
      ticks.push(y)
    return ticks
  }, [axisMin, axisMax])

  const span = Math.max(1, axisMax - axisMin)
  const pct = (year: number) => ((year - axisMin) / span) * 100

  return (
    <div>
      <p className="mb-3 max-w-3xl text-sm text-gray-500">{description}</p>

      {/* Legend + hover status */}
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-gray-300" />
          {totalLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-un-blue" />
          {highlightLabel}
        </span>
        <span className="ml-auto text-gray-500">
          {hover ? (
            <span>
              <span className="font-medium text-gray-900">{hover.year}</span>
              {` — ${hover.total.toLocaleString()} ${totalHoverLabel} · `}
              <span className="font-medium text-un-blue">
                {`${hover.highlight.toLocaleString()} ${highlightHoverLabel}`}
              </span>
            </span>
          ) : (
            <span className="text-gray-400">Hover a year for details</span>
          )}
        </span>
      </div>

      {/* Bars */}
      <div className="flex h-44 items-end gap-px">
        {years.map((d) => {
          const totalH =
            d.total > 0 ? Math.max(2, (d.total / maxCount) * 100) : 0
          const highlightH =
            d.highlight > 0 ? Math.max(2, (d.highlight / maxCount) * 100) : 0
          const isSelected = selectedYear === d.year
          const dim = selectedYear !== null && !isSelected
          return (
            <div
              key={d.year}
              className="relative flex h-full flex-1 cursor-pointer items-end"
              onMouseEnter={() => setHover(d)}
              onMouseLeave={() => setHover(null)}
              onClick={() => selectYear(d.year)}
              title={`${d.year}: ${d.total} ${totalHoverLabel}, ${d.highlight} ${highlightHoverLabel}`}
            >
              {d.total > 0 ? (
                <>
                  <div
                    className="absolute bottom-0 w-full rounded-[1px] bg-gray-300 transition-opacity"
                    style={{ height: `${totalH}%`, opacity: dim ? 0.4 : 1 }}
                  />
                  {highlightH > 0 && (
                    <div
                      className="absolute bottom-0 w-full rounded-[1px] bg-un-blue transition-opacity"
                      style={{
                        height: `${highlightH}%`,
                        opacity: dim ? 0.4 : 1,
                      }}
                    />
                  )}
                </>
              ) : (
                <div className="h-px w-full bg-muted-foreground/20" />
              )}
              {isSelected && (
                <div className="pointer-events-none absolute inset-0 rounded-[1px] ring-1 ring-un-blue" />
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
