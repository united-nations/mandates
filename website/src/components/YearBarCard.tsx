'use client'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useFilters } from '@/contexts/FilterContext'
import { Calendar } from 'lucide-react'
import { useMemo, useCallback, useRef } from 'react'

interface YearBarCardProps {
  yearDistribution: Record<string, number>
  yearRange: { min: number; max: number }
  activeFilterCount?: number
}

const FULL_MIN = 1946
const FULL_MAX = 2025

export function YearBarCard({
  yearDistribution,
  yearRange,
  activeFilterCount = 0,
}: YearBarCardProps) {
  const { filters, setMultipleFilters } = useFilters()
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<number | null>(null)
  const isDragging = useRef(false)

  const selectedRange: [number, number] | null =
    filters.start_year && filters.end_year
      ? [parseInt(filters.start_year), parseInt(filters.end_year)]
      : null

  const years = useMemo(() => {
    const result: { year: number; count: number }[] = []
    for (let y = FULL_MIN; y <= FULL_MAX; y++) {
      result.push({ year: y, count: yearDistribution[y] || 0 })
    }
    return result
  }, [yearDistribution])

  const maxCount = useMemo(
    () => Math.max(...years.map((y) => y.count), 1),
    [years]
  )

  const getYearFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return FULL_MIN
    const rect = el.getBoundingClientRect()
    const pct = (clientX - rect.left) / rect.width
    const year = Math.round(FULL_MIN + pct * (FULL_MAX - FULL_MIN))
    return Math.max(FULL_MIN, Math.min(FULL_MAX, year))
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragStart.current = getYearFromClientX(e.clientX)
      isDragging.current = false
    },
    [getYearFromClientX]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragStart.current !== null && e.buttons === 1) {
        isDragging.current = true
      }
    },
    []
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const endYear = getYearFromClientX(e.clientX)
      const startYear = dragStart.current
      dragStart.current = null

      if (startYear === null) return

      const min = Math.min(startYear, endYear)
      const max = Math.max(startYear, endYear)

      if (!isDragging.current) {
        if (selectedRange && selectedRange[0] === endYear && selectedRange[1] === endYear) {
          setMultipleFilters({ start_year: undefined, end_year: undefined })
        } else {
          setMultipleFilters({
            start_year: endYear.toString(),
            end_year: endYear.toString(),
          })
        }
      } else {
        if (selectedRange && selectedRange[0] === min && selectedRange[1] === max) {
          setMultipleFilters({ start_year: undefined, end_year: undefined })
        } else {
          setMultipleFilters({
            start_year: min.toString(),
            end_year: max.toString(),
          })
        }
      }
      isDragging.current = false
    },
    [getYearFromClientX, selectedRange, setMultipleFilters]
  )

  const displayRange = selectedRange
    ? selectedRange[0] === selectedRange[1]
      ? `${selectedRange[0]}`
      : `${selectedRange[0]}–${selectedRange[1]}`
    : `${FULL_MIN}–${FULL_MAX}`

  return (
    <Card
      className={cn(
        'relative h-full min-w-[220px] snap-center border-0 bg-un-blue/10 px-4 py-3 shadow-none transition-all sm:min-w-0',
        activeFilterCount > 0 && 'ring-2 ring-un-blue/40'
      )}
    >
      <div className="flex items-center gap-2">
        <Calendar className="size-4 shrink-0 text-un-blue" />
        <span className="text-sm leading-tight font-medium text-un-blue">
          Years
        </span>
        <span className="ml-auto text-xl leading-tight font-bold tabular-nums text-foreground">
          {displayRange}
        </span>
      </div>
      <div
        ref={containerRef}
        className="mt-2 flex h-10 cursor-crosshair items-end gap-px select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {years.map(({ year, count }) => {
          const height =
            count > 0 ? Math.max(8, (count / maxCount) * 100) : 0
          const isSelected = selectedRange
            ? year >= selectedRange[0] && year <= selectedRange[1]
            : true
          return (
            <div
              key={year}
              className="flex flex-1 items-end pointer-events-none"
              style={{ height: '100%' }}
            >
              {count > 0 ? (
                <div
                  className={cn(
                    'w-full rounded-[1px] transition-colors',
                    isSelected ? 'bg-un-blue' : 'bg-gray-200'
                  )}
                  style={{ height: `${height}%` }}
                />
              ) : (
                <div className="h-px w-full bg-muted-foreground/20" />
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{FULL_MIN}</span>
        <span>{FULL_MAX}</span>
      </div>
      {activeFilterCount > 0 && (
        <div className="mt-1 flex items-center gap-1">
          <div className="size-1.5 rounded-full bg-un-blue" />
          <span className="text-[10px] font-medium text-un-blue">
            Year filter active
          </span>
        </div>
      )}
    </Card>
  )
}
