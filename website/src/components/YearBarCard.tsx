'use client'

import { DataCard } from '@/components/DataCard'
import { cn } from '@/lib/utils'
import { useFilters } from '@/contexts/FilterContext'
import { Calendar } from 'lucide-react'
import { useMemo, useCallback, useRef, useState, useEffect } from 'react'

interface YearBarCardProps {
  yearDistribution: Record<string, number>
}

const FULL_MIN = 1946
const FULL_MAX = 2025
const FILTER_DELAY_MS = 600

function useYearData(yearDistribution: Record<string, number>) {
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

  return { years, maxCount }
}

function YearBars({
  years,
  maxCount,
  selectedRange,
  className,
}: {
  years: { year: number; count: number }[]
  maxCount: number
  selectedRange: [number, number] | null
  className?: string
}) {
  return (
    <div className={cn('flex items-end gap-px', className)}>
      {years.map(({ year, count }) => {
        const height = count > 0 ? Math.max(8, (count / maxCount) * 100) : 0
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
                  isSelected ? 'bg-un-blue/50' : 'bg-gray-200'
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
  )
}

function YearSelector({
  yearDistribution,
}: {
  yearDistribution: Record<string, number>
}) {
  const { filters, setMultipleFilters } = useFilters()
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<number | null>(null)
  const isDragging = useRef(false)
  const filterTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { years, maxCount } = useYearData(yearDistribution)

  const committedRange: [number, number] | null =
    filters.start_year && filters.end_year
      ? [parseInt(filters.start_year), parseInt(filters.end_year)]
      : null

  const [localRange, setLocalRange] = useState<[number, number] | null>(
    committedRange
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local slider to committed URL range
    setLocalRange(committedRange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.start_year, filters.end_year])

  const applyFilter = useCallback(
    (range: [number, number] | null) => {
      if (filterTimeout.current) clearTimeout(filterTimeout.current)
      filterTimeout.current = setTimeout(() => {
        if (range) {
          setMultipleFilters({
            start_year: range[0].toString(),
            end_year: range[1].toString(),
          })
        } else {
          setMultipleFilters({ start_year: undefined, end_year: undefined })
        }
      }, FILTER_DELAY_MS)
    },
    [setMultipleFilters]
  )

  useEffect(() => {
    return () => {
      if (filterTimeout.current) clearTimeout(filterTimeout.current)
    }
  }, [])

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
        const endYear = getYearFromClientX(e.clientX)
        const min = Math.min(dragStart.current, endYear)
        const max = Math.max(dragStart.current, endYear)
        setLocalRange([min, max])
      }
    },
    [getYearFromClientX]
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const endYear = getYearFromClientX(e.clientX)
      const startYear = dragStart.current
      dragStart.current = null

      if (startYear === null) return

      const min = Math.min(startYear, endYear)
      const max = Math.max(startYear, endYear)

      let newRange: [number, number] | null

      if (!isDragging.current) {
        if (
          localRange &&
          localRange[0] === endYear &&
          localRange[1] === endYear
        ) {
          newRange = null
        } else {
          newRange = [endYear, endYear]
        }
      } else {
        if (localRange && localRange[0] === min && localRange[1] === max) {
          newRange = null
        } else {
          newRange = [min, max]
        }
      }

      setLocalRange(newRange)
      applyFilter(newRange)
      isDragging.current = false
    },
    [getYearFromClientX, localRange, applyFilter]
  )

  const displayRange = localRange
    ? localRange[0] === localRange[1]
      ? `${localRange[0]}`
      : `${localRange[0]}–${localRange[1]}`
    : `${FULL_MIN}–${FULL_MAX}`

  return (
    <div>
      <div className="mb-2 text-center text-lg font-bold tabular-nums">
        {displayRange}
      </div>
      <div
        ref={containerRef}
        className="flex h-32 cursor-crosshair items-end gap-px select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {years.map(({ year, count }) => {
          const height = count > 0 ? Math.max(8, (count / maxCount) * 100) : 0
          const isSelected = localRange
            ? year >= localRange[0] && year <= localRange[1]
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
                    isSelected ? 'bg-un-blue/50' : 'bg-gray-200'
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
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{FULL_MIN}</span>
        <span>{FULL_MAX}</span>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Click or drag to select a year range
      </p>
    </div>
  )
}

export function YearBarCard({
  yearDistribution,
}: YearBarCardProps) {
  const { filters } = useFilters()
  const { years, maxCount } = useYearData(yearDistribution)
  const [isOpen, setIsOpen] = useState(false)

  const selectedRange: [number, number] | null =
    filters.start_year && filters.end_year
      ? [parseInt(filters.start_year), parseInt(filters.end_year)]
      : null

  const displayRange = selectedRange
    ? selectedRange[0] === selectedRange[1]
      ? `${selectedRange[0]}`
      : `${selectedRange[0]}–${selectedRange[1]}`
    : `${FULL_MIN}–${FULL_MAX}`

  return (
    <DataCard
      title="Years"
      value={displayRange}
      icon={Calendar}
      description="Filter mandates by adoption year."
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      popoverClassName="w-[calc(100vw-4rem)] sm:w-[calc(100vw-6rem)] max-w-5xl"
      customPreview={
        <>
          <YearBars
            years={years}
            maxCount={maxCount}
            selectedRange={selectedRange}
            className="mt-2 h-10"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{FULL_MIN}</span>
            <span>{FULL_MAX}</span>
          </div>
        </>
      }
    >
      <YearSelector yearDistribution={yearDistribution} />
    </DataCard>
  )
}
