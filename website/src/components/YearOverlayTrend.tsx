'use client'

import { useMemo, useState } from 'react'

import { useFilters } from '@/contexts/FilterContext'
import { explainerTexts } from '@/lib/en_text_contents'

const AXIS_MIN = 1946

export interface YearOverlayPoint {
  year: number
  /** Background (grey) series — always the larger, enclosing quantity. */
  total: number
  /** Foreground (un-blue) series — a subset of `total`. */
  highlight: number
  /** Optional mutually exclusive categories partitioning the highlighted total. */
  parts?: Record<string, number>
}

interface HighlightSeries {
  key: string
  label: string
  color: string
}

function partCount(point: YearOverlayPoint, key: string): number {
  return key === 'highlight' ? point.highlight : (point.parts?.[key] ?? 0)
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
  totalLabel,
  highlightLabel,
  complementLabel,
  compositionNote,
  totalHoverLabel,
  highlightHoverLabel,
  highlightSeries,
  boundaryYear,
  showComposition = true,
}: {
  data: YearOverlayPoint[]
  /** Label for the total document count. */
  totalLabel: string
  /** Label for the highlighted subset. */
  highlightLabel: string
  /** The remainder of the total after subtracting the highlighted subset. */
  complementLabel: string
  compositionNote?: string
  /** Short word after the count in the hover readout, e.g. "adopted". */
  totalHoverLabel: string
  /** Short word after the count in the hover readout, e.g. "cited". */
  highlightHoverLabel: string
  highlightSeries?: HighlightSeries[]
  /** Divider before this year's bar, if it lies within the plotted range. */
  boundaryYear?: number
  showComposition?: boolean
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

  const series = useMemo(
    () =>
      highlightSeries ?? [
        { key: 'highlight', label: highlightLabel, color: 'bg-un-blue' },
      ],
    [highlightSeries, highlightLabel]
  )
  const axisMin = years.length ? years[0].year : AXIS_MIN
  const axisMax = years.length ? years[years.length - 1].year : AXIS_MIN

  const composition = useMemo(() => {
    const total = years.reduce((sum, year) => sum + year.total, 0)
    const highlight = years.reduce((sum, year) => sum + year.highlight, 0)
    const counts = series.map((part) =>
      years.reduce((sum, year) => sum + partCount(year, part.key), 0)
    )
    // Allocate tenths by largest remainder so rounded shares total 100%,
    // including when the uncited complement is zero.
    const shares = [...counts, total - highlight].map((count) =>
      total > 0 ? (count / total) * 1000 : 0
    )
    const tenths = shares.map(Math.floor)
    const remainder =
      total > 0 ? 1000 - tenths.reduce((sum, value) => sum + value, 0) : 0
    shares
      .map((share, index) => ({ index, fraction: share - tenths[index] }))
      .sort((a, b) => b.fraction - a.fraction)
      .slice(0, remainder)
      .forEach(({ index }) => {
        tenths[index]++
      })
    const parts = series.map((part, index) => ({
      ...part,
      count: counts[index],
      percent: tenths[index] / 10,
    }))
    return {
      total,
      highlight,
      complement: total - highlight,
      parts,
      complementPercent: tenths[series.length] / 10,
    }
  }, [years, series])

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
    <div role="group" aria-label={totalLabel}>
      <div
        className={
          showComposition
            ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]'
            : undefined
        }
      >
        <div className="min-w-0">
          {/* Yearly hover status */}
          <div className="mb-2 min-h-4 text-xs text-muted-foreground">
            <span>
              {hover ? (
                <span>
                  <span className="font-medium text-foreground">
                    {hover.year}
                  </span>
                  {` — ${hover.total.toLocaleString()} ${totalHoverLabel} · `}
                  <span className="font-medium text-un-blue-text">
                    {`${hover.highlight.toLocaleString()} ${highlightHoverLabel}`}
                  </span>
                  {highlightSeries && (
                    <span className="text-foreground">
                      {series
                        .map(
                          (part) =>
                            ` · ${partCount(hover, part.key).toLocaleString()} ${part.label}`
                        )
                        .join('')}
                      {` · ${(hover.total - hover.highlight).toLocaleString()} ${complementLabel}`}
                    </span>
                  )}
                </span>
              ) : null}
            </span>
          </div>

          {/* Bars */}
          <div className="flex h-44 items-end gap-px">
            {years.map((d) => {
              const totalH =
                d.total > 0 ? Math.max(2, (d.total / maxCount) * 100) : 0
              const highlightH =
                d.highlight > 0
                  ? Math.max(2, (d.highlight / maxCount) * 100)
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
                  title={`${d.year}: ${d.total} ${totalHoverLabel}, ${d.highlight} ${highlightHoverLabel}${highlightSeries ? series.map((part) => `, ${partCount(d, part.key)} ${part.label}`).join('') + `, ${d.total - d.highlight} ${complementLabel}` : ''}`}
                >
                  {boundaryYear !== undefined &&
                    d.year === boundaryYear &&
                    axisMin < boundaryYear && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute top-0 bottom-0 -left-px border-l border-dashed border-muted-foreground/40"
                      />
                    )}
                  {d.total > 0 ? (
                    <>
                      <div
                        className="absolute bottom-0 w-full rounded-[1px] bg-gray-300 transition-opacity"
                        style={{
                          height: `${totalH}%`,
                          opacity: dim ? 0.4 : 1,
                        }}
                      />
                      {highlightH > 0 && (
                        <div
                          className="absolute bottom-0 flex w-full flex-col-reverse overflow-hidden rounded-[1px] transition-opacity"
                          style={{
                            height: `${highlightH}%`,
                            opacity: dim ? 0.4 : 1,
                          }}
                        >
                          {series.map((part) => (
                            <div
                              key={part.key}
                              className={`w-full shrink-0 ${part.color}`}
                              style={{
                                height: `${(partCount(d, part.key) / d.highlight) * 100}%`,
                              }}
                            />
                          ))}
                        </div>
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
          <div className="relative mt-1 h-4 text-xs text-muted-foreground">
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
          {compositionNote && (
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
              {compositionNote}
            </p>
          )}
        </div>
        {showComposition && (
          <div className="border-t border-border pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
            <div>
              <div className="min-w-0">
                <div
                  aria-hidden="true"
                  className="flex h-16 overflow-hidden rounded-sm bg-muted"
                >
                  {composition.total > 0 && (
                    <>
                      {composition.parts.map((part) => (
                        <div
                          key={part.key}
                          className={part.color}
                          style={{
                            width: `${(part.count / composition.total) * 100}%`,
                          }}
                        />
                      ))}
                      <div className="flex-1 bg-gray-300" />
                    </>
                  )}
                </div>
                <dl className="mt-3 space-y-3 text-sm">
                  {[
                    ...composition.parts,
                    {
                      label: complementLabel,
                      count: composition.complement,
                      percent: composition.complementPercent,
                      color: 'bg-gray-300',
                    },
                  ].map((part) => (
                    <div key={part.label}>
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <span
                          aria-hidden="true"
                          className={`h-3 w-3 shrink-0 rounded-sm ${part.color}`}
                        />
                        {part.label}
                      </dt>
                      <dd className="mt-0.5 font-medium text-foreground tabular-nums">
                        {part.count.toLocaleString()} ·{' '}
                        {composition.total > 0
                          ? `${part.percent.toFixed(1)}%`
                          : '—'}
                      </dd>
                    </div>
                  ))}
                </dl>
                {composition.total === 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {explainerTexts.trendComposition.empty}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
