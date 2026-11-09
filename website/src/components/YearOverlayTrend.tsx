'use client'

import { useMemo, useState } from 'react'

import { useFilters } from '@/contexts/FilterContext'
import { explainerTexts } from '@/lib/en_text_contents'

const AXIS_MIN = 1946

export interface YearOverlayPoint {
  year: number | null
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
  totalMembership?: number
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
    const dated = data.filter(
      (row): row is YearOverlayPoint & { year: number } => row.year !== null
    )
    if (dated.length === 0) return [] as (YearOverlayPoint & { year: number })[]
    const byYear = new Map(dated.map((row) => [row.year, row]))
    const min = Math.min(AXIS_MIN, ...dated.map((row) => row.year))
    const max = Math.max(...dated.map((row) => row.year))
    const out: (YearOverlayPoint & { year: number })[] = []
    for (let year = min; year <= max; year++) {
      out.push(byYear.get(year) ?? { year, total: 0, highlight: 0 })
    }
    return out
  }, [data])
  const undated = data.find((row) => row.year === null) ?? {
    year: null,
    total: 0,
    highlight: 0,
  }
  const maxCount = Math.max(1, ...data.map((row) => row.total))

  const series = useMemo<HighlightSeries[]>(
    () =>
      highlightSeries ?? [
        { key: 'highlight', label: highlightLabel, color: 'bg-un-blue' },
      ],
    [highlightSeries, highlightLabel]
  )
  const axisMin = years.length ? years[0].year : AXIS_MIN
  const axisMax = years.length ? years[years.length - 1].year : AXIS_MIN

  const composition = useMemo(() => {
    const total = data.reduce((sum, year) => sum + year.total, 0)
    const highlight = data.reduce((sum, year) => sum + year.highlight, 0)
    const counts = series.map((part) =>
      data.reduce((sum, year) => sum + partCount(year, part.key), 0)
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
  }, [data, series])

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

  const timelineColumns = Math.max(1, years.length)
  // All marks use 1fr. The empty half-slot separates Undated without widening it.
  const columnTemplate = `repeat(${timelineColumns}, minmax(0, 1fr)) minmax(0, 0.5fr) minmax(0, 1fr)`

  const renderBar = (d: YearOverlayPoint) => {
    const totalH = d.total > 0 ? (d.total / maxCount) * 100 : 0
    const highlightH = d.highlight > 0 ? (d.highlight / maxCount) * 100 : 0
    const isSelected = d.year !== null && selectedYear === d.year
    const dim = selectedYear !== null && !isSelected
    return (
      <div
        key={d.year ?? 'undated'}
        className={`relative flex h-full flex-1 items-end ${d.year === null ? '' : 'cursor-pointer'}`}
        role="group"
        aria-label={
          d.year === null
            ? explainerTexts.trendComposition.undated
            : String(d.year)
        }
        onMouseEnter={() => setHover(d)}
        onMouseLeave={() => setHover(null)}
        onClick={
          d.year === null
            ? undefined
            : () => {
                if (d.year !== null) selectYear(d.year)
              }
        }
        title={`${d.year ?? explainerTexts.trendComposition.undated}: ${d.total} ${totalHoverLabel}, ${d.highlight} ${highlightHoverLabel}${highlightSeries ? series.map((part) => `, ${partCount(d, part.key)} ${part.label}`).join('') + `, ${d.total - d.highlight} ${complementLabel}` : ''}`}
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
  }

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
                    {hover.year ?? explainerTexts.trendComposition.undated}
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

          <div
            className="grid h-44 items-end gap-px"
            style={{ gridTemplateColumns: columnTemplate }}
          >
            {years.length ? years.map(renderBar) : <div />}
            <div aria-hidden="true" />
            {renderBar(undated)}
          </div>
          <div
            className="mt-1 grid h-9 gap-px text-xs text-muted-foreground"
            style={{ gridTemplateColumns: columnTemplate }}
          >
            <div
              className="relative h-4"
              style={{ gridColumn: `1 / span ${timelineColumns}` }}
            >
              {decades.map((y) => (
                <span
                  key={y}
                  className="absolute -translate-x-1/2 tabular-nums"
                  style={{ left: `${pct(y)}%` }}
                >
                  {y}
                </span>
              ))}
              {years.length > 0 && (
                <span className="absolute right-0 tabular-nums">{axisMax}</span>
              )}
            </div>
            <div aria-hidden="true" />
            <div className="relative">
              <span
                className="absolute top-5 right-0 whitespace-nowrap"
                title={explainerTexts.trendComposition.undatedExplanation}
              >
                {explainerTexts.trendComposition.undated}
              </span>
            </div>
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
                      totalMembership: undefined,
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
                      {part.totalMembership !== undefined && (
                        <dd className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                          {explainerTexts.citationTrend.totalMembership.replace(
                            '{count}',
                            part.totalMembership.toLocaleString()
                          )}
                        </dd>
                      )}
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
