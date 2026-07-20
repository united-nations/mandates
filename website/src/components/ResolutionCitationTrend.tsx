'use client'

import { useMemo, useState } from 'react'

import { useFilters } from '@/contexts/FilterContext'
import type { ResolutionCitationTrendYear } from '@/lib/data/mandates'

const AXIS_MIN = 1946

/**
 * Resolutions-vs-cited-mandates trend for the /secretariat "Trends over time"
 * expander. One bar per year over the full catalog history, with two series on
 * a shared scale: a grey background bar (all resolutions/decisions adopted that
 * year) and a shorter un-blue foreground bar (those cited as mandates in the
 * selected budget version). The blue series is a subset of the grey by
 * construction, so it always sits inside its grey bar.
 *
 * Clicking a year sets the year filter (start_year = end_year) and scrolls to
 * the mandate list; clicking the already-selected year clears it. The selected
 * year's bar is emphasised, derived from the active URL filter.
 */
export function ResolutionCitationTrend({
  data,
}: {
  data: ResolutionCitationTrendYear[]
}) {
  const { filters, setMultipleFilters } = useFilters()
  const [hover, setHover] = useState<ResolutionCitationTrendYear | null>(null)

  // Dense full-range axis: fill any gap years so the time axis is linear even
  // where a year has no documents.
  const years = useMemo(() => {
    if (data.length === 0) return [] as ResolutionCitationTrendYear[]
    const byYear = new Map(data.map((d) => [d.year, d]))
    const min = Math.min(AXIS_MIN, data[0].year)
    const max = data[data.length - 1].year
    const out: ResolutionCitationTrendYear[] = []
    for (let y = min; y <= max; y++) {
      out.push(byYear.get(y) ?? { year: y, resolutions: 0, citedMandates: 0 })
    }
    return out
  }, [data])

  const maxCount = useMemo(
    () => Math.max(1, ...years.map((y) => y.resolutions)),
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
      <p className="mb-3 max-w-3xl text-sm text-gray-500">
        Resolutions, decisions and similar documents adopted each year (grey),
        and how many of them are cited as mandates in the programme budget
        (blue). Click a year to filter the mandates below to it.
      </p>

      {/* Legend + hover status */}
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-gray-300" />
          Resolutions &amp; decisions adopted
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-un-blue" />
          Cited as mandates
        </span>
        <span className="ml-auto text-gray-500">
          {hover ? (
            <span>
              <span className="font-medium text-gray-900">{hover.year}</span>
              {` — ${hover.resolutions.toLocaleString()} adopted · `}
              <span className="font-medium text-un-blue">
                {hover.citedMandates.toLocaleString()} cited
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
          const greyH =
            d.resolutions > 0
              ? Math.max(2, (d.resolutions / maxCount) * 100)
              : 0
          const blueH =
            d.citedMandates > 0
              ? Math.max(2, (d.citedMandates / maxCount) * 100)
              : 0
          const isSelected = selectedYear === d.year
          const dim = selectedYear !== null && !isSelected
          return (
            <div
              key={d.year}
              className="relative flex h-full flex-1 cursor-pointer items-end"
              onMouseEnter={() => setHover(d)}
              onMouseLeave={() => setHover(null)}
              onClick={() => selectYear(d.year)}
              title={`${d.year}: ${d.resolutions} adopted, ${d.citedMandates} cited`}
            >
              {d.resolutions > 0 ? (
                <>
                  <div
                    className="absolute bottom-0 w-full rounded-[1px] bg-gray-300 transition-opacity"
                    style={{ height: `${greyH}%`, opacity: dim ? 0.4 : 1 }}
                  />
                  {blueH > 0 && (
                    <div
                      className="absolute bottom-0 w-full rounded-[1px] bg-un-blue transition-opacity"
                      style={{ height: `${blueH}%`, opacity: dim ? 0.4 : 1 }}
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
