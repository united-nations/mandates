'use client'

import { Button } from '@/components/ui/button'
import { Chip, ChipCount } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useFilters } from '@/contexts/FilterContext'
import { ChevronDown, ChevronUp, Filter, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { titleCase } from 'title-case'
import type { FilterParamKey } from '@/lib/filter-constants'
import type { BudgetStream } from '@/types'
import { BudgetHierarchyTree } from './BudgetHierarchyTree'
import { isColumnFilterActive, type ColumnDef } from './MandateColumns'

export interface FilterOption {
  value: string
  label?: string
  count?: number
}

/** Optional grouping for a pill filter: renders each run of options under a
 *  heading. Values reference `FilterOption.value`; empty groups are hidden. */
export interface FilterGroup {
  label: string
  values: string[]
}

interface ColumnHeaderFilterProps {
  column: ColumnDef
  currentSort?: string
  filterOptions?: FilterOption[]
  filterGroups?: FilterGroup[]
  yearRange?: { min: number; max: number }
  budgetHierarchy?: BudgetStream[]
}

/** The header is a flex row, so `text-align` alone cannot place it. */
const HEADER_JUSTIFY: Record<string, string> = {
  right: 'justify-end',
  center: 'justify-center',
}

export function ColumnHeaderFilter({
  column,
  currentSort,
  filterOptions,
  filterGroups,
  yearRange,
  budgetHierarchy,
}: ColumnHeaderFilterProps) {
  const { filters, setFilter } = useFilters()

  const isFilterActive = isColumnFilterActive(column, filters)

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
    <div
      className={`flex items-center gap-0.5 ${
        HEADER_JUSTIFY[column.align ?? ''] ?? ''
      }`}
    >
      <span
        className={`whitespace-nowrap ${column.sortKeys ? 'cursor-pointer select-none' : ''}`}
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
          groups={filterGroups}
          yearRange={yearRange}
          budgetHierarchy={budgetHierarchy}
        />
      )}
    </div>
  )
}

interface ColumnFilterBodyProps {
  column: ColumnDef
  options?: FilterOption[]
  groups?: FilterGroup[]
  yearRange?: { min: number; max: number }
  budgetHierarchy?: BudgetStream[]
  /** Called once the filter has been written, so the surface can close. */
  onDone?: () => void
}

/**
 * The controls for one column's filter, without any container of its own.
 *
 * Two surfaces render it: the funnel popover in the table header, and the
 * "More columns and filters" menu, which reaches every column's filter without
 * the reader having to switch the column on first. It reads and writes the
 * filter state itself so neither surface has to thread the callbacks through.
 */
export function ColumnFilterBody({
  column,
  options,
  groups,
  yearRange,
  budgetHierarchy,
  onDone,
}: ColumnFilterBodyProps) {
  const { filters, setFilter, clearFilter, setMultipleFilters } = useFilters()

  const currentValue =
    column.filterParam && column.filterType !== 'yearRange'
      ? (filters as Record<string, string | undefined>)[column.filterParam]
      : undefined

  const done = () => onDone?.()

  return (
    <>
      {column.filterType === 'hierarchy' && (
        <BudgetHierarchyTree hierarchy={budgetHierarchy ?? []} />
      )}
      {column.filterType === 'pill' && (
        <PillFilter
          searchNoun={column.filterNoun ?? column.label}
          options={options || []}
          groups={groups}
          currentValue={currentValue}
          onSelect={(value) => {
            setFilter(column.filterParam! as FilterParamKey, value)
            done()
          }}
          onClear={() => {
            clearFilter(column.filterParam! as FilterParamKey)
            done()
          }}
        />
      )}
      {column.filterType === 'yearRange' && (
        <YearRangeFilter
          yearRange={yearRange}
          startYear={filters.start_year}
          endYear={filters.end_year}
          onApply={(start, end) => {
            setMultipleFilters({
              start_year: start?.toString(),
              end_year: end?.toString(),
            })
            done()
          }}
          onClear={() => {
            setMultipleFilters({
              start_year: undefined,
              end_year: undefined,
            })
            done()
          }}
        />
      )}
      {column.filterType === 'simpleSelect' && (
        <SimpleSelectFilter
          options={options || []}
          currentValue={currentValue}
          onSelect={(value) => {
            setFilter(column.filterParam! as FilterParamKey, value)
            done()
          }}
          onClear={() => {
            clearFilter(column.filterParam! as FilterParamKey)
            done()
          }}
        />
      )}
    </>
  )
}

interface FilterPopoverProps {
  column: ColumnDef
  isActive: boolean
  options?: FilterOption[]
  groups?: FilterGroup[]
  yearRange?: { min: number; max: number }
  budgetHierarchy?: BudgetStream[]
}

function FilterPopover({
  column,
  isActive,
  options,
  groups,
  yearRange,
  budgetHierarchy,
}: FilterPopoverProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={`Filter by ${column.label}`}
          className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${
            isActive
              ? 'bg-un-blue text-white'
              : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'
          }`}
        >
          <Filter className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={
          column.filterType === 'hierarchy' ? 'w-[420px] p-3' : 'w-auto p-3'
        }
        sideOffset={4}
      >
        <ColumnFilterBody
          column={column}
          options={options}
          groups={groups}
          yearRange={yearRange}
          budgetHierarchy={budgetHierarchy}
          onDone={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}

function PillFilter({
  searchNoun,
  options,
  groups,
  currentValue,
  onSelect,
  onClear,
}: {
  searchNoun: string
  options: FilterOption[]
  groups?: FilterGroup[]
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

  const renderPill = (option: FilterOption) => {
    const isSelected = currentValue === option.value
    const tone = isSelected ? 'selected' : 'neutral'
    return (
      <Chip
        key={option.value}
        density="dense"
        tone={tone}
        onClick={() => (isSelected ? onClear() : onSelect(option.value))}
        className="whitespace-nowrap"
      >
        <span>{option.label ?? titleCase(option.value)}</span>
        {option.count !== undefined && (
          <ChipCount tone={tone}>{option.count}</ChipCount>
        )}
      </Chip>
    )
  }

  // Grouped mode: a curated, bounded set — show every filtered option under its
  // category heading, no lazy truncation. Empty groups (all filtered out) hide.
  const grouped = useMemo(() => {
    if (!groups) return null
    const byValue = new Map(filtered.map((o) => [o.value, o]))
    return groups
      .map((g) => ({
        label: g.label,
        options: g.values
          .map((v) => byValue.get(v))
          .filter((o): o is FilterOption => o !== undefined),
      }))
      .filter((g) => g.options.length > 0)
  }, [groups, filtered])

  const displayed =
    !showAll && !searchQuery && filtered.length > lazyThreshold
      ? filtered.slice(0, lazyThreshold)
      : filtered

  const hasMore = !searchQuery && filtered.length > lazyThreshold && !showAll

  return (
    <div className="w-64 space-y-3">
      {showSearch && (
        <div className="relative">
          <Search className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={`Search ${searchNoun}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-7 text-sm focus-visible:ring-1 focus-visible:ring-offset-0"
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

      {grouped ? (
        <div className="max-h-72 space-y-3 overflow-y-auto">
          {grouped.map((group) => (
            <div key={group.label} className="space-y-1.5">
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.options.map(renderPill)}
              </div>
            </div>
          ))}
          {grouped.length === 0 && (
            <p className="py-2 text-xs text-gray-400">No options found</p>
          )}
        </div>
      ) : (
        <>
          <div className="flex max-h-64 flex-wrap gap-1.5 overflow-y-auto">
            {displayed.map(renderPill)}
            {displayed.length === 0 && (
              <p className="py-2 text-xs text-gray-400">No options found</p>
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
        </>
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
          className="h-7 w-16 rounded border border-input bg-transparent px-2 text-center text-xs focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
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
          className="h-7 w-16 rounded border border-input bg-transparent px-2 text-center text-xs focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleApply}
          className="h-7 px-2 text-xs"
        >
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
  options,
  currentValue,
  onSelect,
  onClear,
}: {
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
      <div className="max-h-64 space-y-0.5 overflow-y-auto">
        {options.map((option) => {
          const isSelected = currentValue === option.value
          return (
            <button
              key={option.value}
              onClick={() => (isSelected ? onClear() : onSelect(option.value))}
              className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                isSelected
                  ? 'bg-un-blue/10 font-medium text-un-blue'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <span>{option.label ?? option.value}</span>
              {/* Full-width menu row, not a chip — but the count is the same
                  count, so it takes the one shared treatment. */}
              {option.count !== undefined && (
                <ChipCount>{option.count}</ChipCount>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
