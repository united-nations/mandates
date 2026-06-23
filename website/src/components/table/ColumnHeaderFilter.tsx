'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useFilters } from '@/contexts/FilterContext'
import {
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { titleCase } from 'title-case'
import type { FilterParamKey } from '@/lib/filter-constants'
import type { ColumnDef } from './MandateColumns'

interface FilterOption {
  value: string
  label?: string
  count?: number
}

interface ColumnHeaderFilterProps {
  column: ColumnDef
  currentSort?: string
  filterOptions?: FilterOption[]
  yearRange?: { min: number; max: number }
}

export function ColumnHeaderFilter({
  column,
  currentSort,
  filterOptions,
  yearRange,
}: ColumnHeaderFilterProps) {
  const { filters, setFilter, clearFilter, setMultipleFilters } = useFilters()

  const getFilterValue = (param: string): string | undefined =>
    (filters as Record<string, string | undefined>)[param]

  const isFilterActive = column.filterParam
    ? column.filterType === 'yearRange'
      ? !!(filters.start_year || filters.end_year)
      : !!getFilterValue(column.filterParam)
    : false

  const sortDirection = column.sortKeys
    ? currentSort === column.sortKeys.asc
      ? 'asc'
      : currentSort === column.sortKeys.desc
        ? 'desc'
        : null
    : null

  const handleSort = () => {
    if (!column.sortKeys) return
    if (sortDirection === 'desc') {
      setFilter('sort_by', column.sortKeys.asc)
    } else {
      setFilter('sort_by', column.sortKeys.desc)
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      <span
        className={column.sortKeys ? 'cursor-pointer select-none' : ''}
        onClick={column.sortKeys ? handleSort : undefined}
      >
        {column.label}
      </span>

      {column.sortKeys && (
        <button
          onClick={handleSort}
          className="transition-colors hover:text-gray-600"
        >
          {sortDirection === 'asc' ? (
            <ChevronUp className="h-3.5 w-3.5 text-un-blue" />
          ) : sortDirection === 'desc' ? (
            <ChevronDown className="h-3.5 w-3.5 text-un-blue" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 opacity-40" />
          )}
        </button>
      )}

      {column.filterParam && column.filterType && (
        <FilterPopover
          column={column}
          isActive={isFilterActive}
          options={filterOptions}
          yearRange={yearRange}
          currentValue={
            column.filterType === 'yearRange'
              ? undefined
              : getFilterValue(column.filterParam)
          }
          startYear={filters.start_year}
          endYear={filters.end_year}
          setFilter={(key, value) =>
            setFilter(key as FilterParamKey, value)
          }
          clearFilter={(key) => clearFilter(key as FilterParamKey)}
          setMultipleFilters={setMultipleFilters}
        />
      )}
    </div>
  )
}

interface FilterPopoverProps {
  column: ColumnDef
  isActive: boolean
  options?: FilterOption[]
  yearRange?: { min: number; max: number }
  currentValue?: string
  startYear?: string
  endYear?: string
  setFilter: (key: string, value: string | undefined) => void
  clearFilter: (key: string) => void
  setMultipleFilters: (updates: Record<string, string | undefined>) => void
}

function FilterPopover({
  column,
  isActive,
  options,
  yearRange,
  currentValue,
  startYear,
  endYear,
  setFilter,
  clearFilter,
  setMultipleFilters,
}: FilterPopoverProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${
            isActive
              ? 'bg-un-blue text-white'
              : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'
          }`}
        >
          <Filter className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3" sideOffset={4}>
        {column.filterType === 'pill' && (
          <PillFilter
            filterParam={column.filterParam!}
            options={options || []}
            currentValue={currentValue}
            onSelect={(value) => {
              setFilter(column.filterParam!, value)
              setOpen(false)
            }}
            onClear={() => {
              clearFilter(column.filterParam!)
              setOpen(false)
            }}
          />
        )}
        {column.filterType === 'yearRange' && (
          <YearRangeFilter
            yearRange={yearRange}
            startYear={startYear}
            endYear={endYear}
            onApply={(start, end) => {
              setMultipleFilters({
                start_year: start?.toString(),
                end_year: end?.toString(),
              })
              setOpen(false)
            }}
            onClear={() => {
              setMultipleFilters({
                start_year: undefined,
                end_year: undefined,
              })
              setOpen(false)
            }}
          />
        )}
        {column.filterType === 'simpleSelect' && (
          <SimpleSelectFilter
            filterParam={column.filterParam!}
            options={options || []}
            currentValue={currentValue}
            onSelect={(value) => {
              setFilter(column.filterParam!, value)
              setOpen(false)
            }}
            onClear={() => {
              clearFilter(column.filterParam!)
              setOpen(false)
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}

function PillFilter({
  filterParam,
  options,
  currentValue,
  onSelect,
  onClear,
}: {
  filterParam: string
  options: FilterOption[]
  currentValue?: string
  onSelect: (value: string) => void
  onClear: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showAll, setShowAll] = useState(false)

  const showSearch = options.length > 8
  const lazyThreshold = 20

  const filtered = useMemo(() => {
    if (!searchQuery) return options
    const q = searchQuery.toLowerCase()
    return options.filter((o) => (o.label ?? o.value).toLowerCase().includes(q))
  }, [options, searchQuery])

  const displayed =
    !showAll && !searchQuery && filtered.length > lazyThreshold
      ? filtered.slice(0, lazyThreshold)
      : filtered

  const hasMore = !searchQuery && filtered.length > lazyThreshold && !showAll

  return (
    <div className="w-64 space-y-3">
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder={`Search ${filterParam}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-sm pl-7 focus-visible:ring-1 focus-visible:ring-offset-0"
          />
        </div>
      )}

      {currentValue && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
          Clear filter
        </button>
      )}

      <div className="flex max-h-64 flex-wrap gap-1.5 overflow-y-auto">
        {displayed.map((option) => {
          const isSelected = currentValue === option.value
          return (
            <button
              key={option.value}
              onClick={() =>
                isSelected ? onClear() : onSelect(option.value)
              }
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors ${
                isSelected
                  ? 'bg-un-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{option.label ?? titleCase(option.value)}</span>
              {option.count !== undefined && (
                <span
                  className={`text-xs ${isSelected ? 'text-blue-200' : 'text-muted-foreground'}`}
                >
                  {option.count}
                </span>
              )}
            </button>
          )
        })}
        {displayed.length === 0 && (
          <p className="text-xs text-gray-400 py-2">No options found</p>
        )}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Show {filtered.length - lazyThreshold} more...
        </button>
      )}
    </div>
  )
}

function YearRangeFilter({
  yearRange,
  startYear,
  endYear,
  onApply,
  onClear,
}: {
  yearRange?: { min: number; max: number }
  startYear?: string
  endYear?: string
  onApply: (start?: number, end?: number) => void
  onClear: () => void
}) {
  const [start, setStart] = useState(startYear || '')
  const [end, setEnd] = useState(endYear || '')

  const handleApply = () => {
    onApply(
      start ? parseInt(start, 10) : undefined,
      end ? parseInt(end, 10) : undefined
    )
  }

  const hasValue = !!(startYear || endYear)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder={yearRange?.min?.toString() || '1946'}
          value={start}
          onChange={(e) => setStart(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          className="h-7 w-16 rounded border border-input bg-transparent px-2 text-xs text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder={yearRange?.max?.toString() || '2025'}
          value={end}
          onChange={(e) => setEnd(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          className="h-7 w-16 rounded border border-input bg-transparent px-2 text-xs text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button size="sm" variant="ghost" onClick={handleApply} className="h-7 px-2 text-xs">
          Apply
        </Button>
      </div>
      {hasValue && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      )}
    </div>
  )
}

function SimpleSelectFilter({
  filterParam,
  options,
  currentValue,
  onSelect,
  onClear,
}: {
  filterParam: string
  options: FilterOption[]
  currentValue?: string
  onSelect: (value: string) => void
  onClear: () => void
}) {
  return (
    <div className="w-48 space-y-2">
      {currentValue && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
          Clear filter
        </button>
      )}
      <div className="max-h-64 overflow-y-auto space-y-0.5">
        {options.map((option) => {
          const isSelected = currentValue === option.value
          return (
            <button
              key={option.value}
              onClick={() =>
                isSelected ? onClear() : onSelect(option.value)
              }
              className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                isSelected
                  ? 'bg-un-blue/10 font-medium text-un-blue'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <span>{option.label ?? option.value}</span>
              {option.count !== undefined && (
                <span
                  className={`text-[10px] ${isSelected ? 'text-un-blue/60' : 'text-gray-400'}`}
                >
                  {option.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
