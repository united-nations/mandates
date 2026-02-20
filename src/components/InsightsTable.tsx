'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState, useMemo, useTransition } from 'react'
import {
  ChevronUp,
  ChevronDown,
  Search,
  RefreshCw,
  Filter,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import type { InsightsResponse, InsightRow } from '@/lib/data/insights'

// ============================================================================
// Constants
// ============================================================================

// Symbol · Year · Organ · Title · Length · Recurrence · Similarity
const GRID_COLS = 'grid-cols-[160px_65px_75px_1fr_100px_130px_200px]'

// ============================================================================
// Types
// ============================================================================

type SortColumn = 'symbol' | 'year' | 'organ' | 'title' | 'length' | 'recurrence' | 'similarity'
type SortDirection = 'asc' | 'desc'

interface InsightsTableProps {
  data: InsightsResponse
}

// ============================================================================
// Helpers
// ============================================================================

function parseSortParam(sortBy?: string): { column: SortColumn | null; direction: SortDirection } {
  if (!sortBy) return { column: 'organ', direction: 'asc' }
  const parts = sortBy.split('_')
  const direction = (parts.pop() as SortDirection) || 'desc'
  const column = parts.join('_') as SortColumn
  return { column, direction }
}

function formatWordCount(count: number | null): string {
  if (count == null) return '—'
  return count.toLocaleString()
}

function formatSimilarity(sim: number | null): string {
  if (sim == null) return '—'
  return `${(sim * 100).toFixed(1)}%`
}

function getSimilarityColor(sim: number | null): string {
  if (sim == null) return 'text-gray-400'
  if (sim >= 0.9) return 'text-red-600'
  if (sim >= 0.7) return 'text-orange-500'
  if (sim >= 0.5) return 'text-yellow-600'
  return 'text-green-600'
}

// ============================================================================
// Sub-components
// ============================================================================

function SortArrow({
  column,
  sortColumn,
  sortDirection,
  onSort,
}: {
  column: SortColumn
  sortColumn: SortColumn | null
  sortDirection: SortDirection
  onSort: (column: SortColumn) => void
}) {
  const isActive = sortColumn === column
  return (
    <button
      onClick={() => onSort(column)}
      className="hover:text-gray-600 transition-colors"
    >
      {isActive ? (
        sortDirection === 'asc' ? (
          <ChevronUp className="h-3.5 w-3.5 text-un-blue" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-un-blue" />
        )
      ) : (
        <ChevronDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  )
}

/** Popover that lists issuing bodies with counts; multi-select */
function BodyFilterPopover({
  options,
  selected,
  onChange,
}: {
  options: { value: string; count: number }[]
  selected: string[]
  onChange: (values: string[]) => void
}) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return options
    const q = search.toLowerCase()
    return options.filter((o) => o.value.toLowerCase().includes(q))
  }, [options, search])

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="hover:text-gray-600 transition-colors relative">
          <Filter className={`h-3 w-3 ${selected.length > 0 ? 'text-un-blue' : 'opacity-40'}`} />
          {selected.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-un-blue text-[8px] text-white flex items-center justify-center leading-none">
              {selected.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-2" align="start">
        {options.length > 6 && (
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs mb-2"
          />
        )}
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {filtered.map((opt) => {
            const active = selected.includes(opt.value)
            return (
              <button
                key={opt.value}
                className={`flex w-full items-center justify-between rounded px-2 py-1 text-xs transition-colors ${
                  active
                    ? 'bg-un-blue/10 text-un-blue font-medium'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                onClick={() => toggle(opt.value)}
              >
                <span className="truncate">{opt.value}</span>
                <span className="ml-2 text-gray-400 tabular-nums">{opt.count.toLocaleString()}</span>
              </button>
            )
          })}
        </div>
        {selected.length > 0 && (
          <button
            className="mt-2 w-full text-center text-[10px] text-gray-400 hover:text-gray-600"
            onClick={() => onChange([])}
          >
            Clear selection
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}

/** Popover to filter by recurrence status */
function RecurrenceFilterPopover({
  selected,
  onChange,
}: {
  selected: string | undefined
  onChange: (value: string | undefined) => void
}) {
  const options = [
    { value: 'recurring', label: 'Recurring only' },
    { value: 'non-recurring', label: 'Non-recurring only' },
  ]

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="hover:text-gray-600 transition-colors relative">
          <Filter className={`h-3 w-3 ${selected ? 'text-un-blue' : 'opacity-40'}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2" align="start">
        <div className="space-y-0.5">
          {options.map((opt) => (
            <button
              key={opt.value}
              className={`flex w-full items-center rounded px-2 py-1.5 text-xs transition-colors ${
                selected === opt.value
                  ? 'bg-un-blue/10 text-un-blue font-medium'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              onClick={() => onChange(selected === opt.value ? undefined : opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ColumnHeaders({
  sortColumn,
  sortDirection,
  onSort,
  issuingBodies,
  selectedBodies,
  onBodiesChange,
  recurrence,
  onRecurrenceChange,
}: {
  sortColumn: SortColumn | null
  sortDirection: SortDirection
  onSort: (column: SortColumn) => void
  issuingBodies: { value: string; count: number }[]
  selectedBodies: string[]
  onBodiesChange: (v: string[]) => void
  recurrence: string | undefined
  onRecurrenceChange: (v: string | undefined) => void
}) {
  return (
    <div
      className={`grid ${GRID_COLS} items-center gap-x-4 px-4 py-2.5 text-xs font-semibold tracking-wide text-gray-500 uppercase bg-gray-50 border-b`}
    >
      {/* Symbol */}
      <div className="flex items-center gap-1">
        <span>Symbol</span>
        <SortArrow column="symbol" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
      </div>

      {/* Year */}
      <div className="flex items-center gap-1">
        <span>Year</span>
        <SortArrow column="year" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
      </div>

      {/* Organ */}
      <div className="flex items-center gap-1">
        <span>Organ</span>
        <BodyFilterPopover
          options={issuingBodies}
          selected={selectedBodies}
          onChange={onBodiesChange}
        />
        <SortArrow column="organ" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
      </div>

      {/* Title */}
      <div className="flex items-center gap-1">
        <span>Title</span>
        <SortArrow column="title" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
      </div>

      {/* Length */}
      <div className="flex items-center gap-1 justify-end">
        <span>Length</span>
        <SortArrow column="length" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
      </div>

      {/* Recurrence */}
      <div className="flex items-center gap-1">
        <span>Recurrence</span>
        <RecurrenceFilterPopover selected={recurrence} onChange={onRecurrenceChange} />
        <SortArrow column="recurrence" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
      </div>

      {/* Similarity */}
      <div className="flex items-center gap-1">
        <span>Similarity</span>
        <SortArrow column="similarity" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
      </div>
    </div>
  )
}

function RecurrenceBadge({ row }: { row: InsightRow }) {
  if (row.is_recurring_series) {
    const count = row.series_symbol_count ?? 0
    const range =
      row.series_first_year && row.series_last_year
        ? `${row.series_first_year}–${row.series_last_year}`
        : null

    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 rounded-full border border-un-blue/20 bg-un-blue/10 px-2 py-0.5 text-[11px] font-medium text-un-blue cursor-default">
              <RefreshCw className="h-3 w-3" />
              {count > 0 ? count : 'Yes'}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Recurring series{count > 0 ? ` — ${count} resolutions` : ''}
              {range ? ` (${range})` : ''}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return <span className="text-gray-300 text-xs">—</span>
}

function SimilarityCell({ row }: { row: InsightRow }) {
  const sim = row.similarity_to_previous
  const color = getSimilarityColor(sim)

  if (sim == null) {
    return <span className="text-gray-300 text-xs">—</span>
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  sim >= 0.9
                    ? 'bg-red-500'
                    : sim >= 0.7
                      ? 'bg-orange-400'
                      : sim >= 0.5
                        ? 'bg-yellow-400'
                        : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(sim * 100, 100)}%` }}
              />
            </div>
            <span className={`text-xs font-medium tabular-nums ${color}`}>
              {formatSimilarity(sim)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {formatSimilarity(sim)} similar to previous version
            {row.previous_symbol ? ` (${row.previous_symbol})` : ''}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function InsightDataRow({ row }: { row: InsightRow }) {
  return (
    <div
      className={`grid ${GRID_COLS} items-center gap-x-4 px-4 py-3 text-sm border-b border-gray-100 hover:bg-gray-50 transition-colors`}
    >
      {/* Symbol */}
      <div className="flex items-center">
        <a
          href={`https://docs.un.org/en/${row.symbol}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={row.symbol}
          className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-un-blue hover:bg-blue-100 transition-colors whitespace-nowrap max-w-[150px] truncate"
        >
          <span className="truncate">{row.symbol}</span>
        </a>
      </div>

      {/* Year */}
      <div className="text-xs text-gray-600 tabular-nums">
        {row.year ?? <span className="text-gray-300">—</span>}
      </div>

      {/* Organ */}
      <div className="text-xs text-gray-500 font-medium" title={row.issuing_body ?? undefined}>
        {row.organ_short ?? <span className="text-gray-300">—</span>}
      </div>

      {/* Title */}
      <div className="truncate text-gray-700" title={row.display_title}>
        {row.display_title !== 'Untitled' ? row.display_title : <span className="text-gray-400 italic">Untitled</span>}
      </div>

      {/* Length (word count) */}
      <div className="text-xs text-gray-600 tabular-nums text-right">
        {formatWordCount(row.word_count)}
      </div>

      {/* Recurrence */}
      <div>
        <RecurrenceBadge row={row} />
      </div>

      {/* Similarity */}
      <div>
        <SimilarityCell row={row} />
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function InsightsTable({ data }: InsightsTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Local search input state (debounced commit to URL)
  const [searchInput, setSearchInput] = useState(searchParams.get('keyword') ?? '')

  // Current state from URL
  const recurrence = searchParams.get('recurrence') || undefined
  const { column: sortColumn, direction: sortDirection } = parseSortParam(
    searchParams.get('sort_by') ?? undefined
  )

  // Multi-select body filter (local state synced to URL)
  const selectedBodies = useMemo(() => {
    const v = searchParams.get('organ')
    return v ? v.split(',') : []
  }, [searchParams])

  const isDefaultSort = !searchParams.get('sort_by')
  const hasActiveFilters = !!(searchInput || selectedBodies.length > 0 || recurrence || !isDefaultSort)

  // Navigate with updated params
  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams, startTransition]
  )

  // Handlers
  const handleSort = useCallback(
    (col: SortColumn) => {
      let newDir: SortDirection = 'desc'
      if (sortColumn === col) {
        newDir = sortDirection === 'desc' ? 'asc' : 'desc'
      }
      updateParams({ sort_by: `${col}_${newDir}`, page: '1' })
    },
    [sortColumn, sortDirection, updateParams]
  )

  const commitSearch = useCallback(
    (value: string) => {
      updateParams({ keyword: value || undefined, page: '1' })
    },
    [updateParams]
  )

  const handleBodiesChange = useCallback(
    (values: string[]) => {
      updateParams({ organ: values.length > 0 ? values.join(',') : undefined, page: '1' })
    },
    [updateParams]
  )

  const handleRecurrenceChange = useCallback(
    (value: string | undefined) => {
      updateParams({ recurrence: value, page: '1' })
    },
    [updateParams]
  )

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateParams({ page: newPage.toString() })
    },
    [updateParams]
  )

  const handleLimitChange = useCallback(
    (newLimit: number) => {
      updateParams({ limit: newLimit.toString(), page: '1' })
    },
    [updateParams]
  )

  const { page, totalPages, totalItems, limit } = data.pagination

  return (
    <div className={`space-y-4 ${isPending ? 'opacity-70 pointer-events-none' : ''}`}>
      {/* Search & summary row */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <form
            onSubmit={(e) => {
              e.preventDefault()
              commitSearch(searchInput)
            }}
          >
            <Input
              placeholder="Search by symbol or title…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 text-sm pl-9 w-96"
            />
          </form>
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('')
                commitSearch('')
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchInput('')
              updateParams({
                keyword: undefined,
                organ: undefined,
                recurrence: undefined,
                sort_by: undefined,
                page: '1',
              })
            }}
            className="h-9 gap-1.5 border-gray-200 text-xs text-gray-500 hover:text-gray-700 hover:border-gray-300"
          >
            <X className="h-3 w-3" />
            Clear all filters
          </Button>
        )}

        <p className="text-xs text-gray-400 ml-auto tabular-nums">
          {totalItems.toLocaleString()} documents
          {hasActiveFilters && ' (filtered)'}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <ColumnHeaders
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          issuingBodies={data.filterOptions.issuingBodies}
          selectedBodies={selectedBodies}
          onBodiesChange={handleBodiesChange}
          recurrence={recurrence}
          onRecurrenceChange={handleRecurrenceChange}
        />

        <div className="divide-y divide-gray-100">
          {data.rows.map((row) => (
            <InsightDataRow key={row.symbol} row={row} />
          ))}
        </div>

        {data.rows.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-gray-400">No documents match your filters.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Show</span>
            {[25, 50, 100, 250, 500].map((size) => (
              <button
                key={size}
                onClick={() => handleLimitChange(size)}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  limit === size
                    ? 'bg-un-blue/10 text-un-blue font-medium'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600 tabular-nums">
              {((page - 1) * limit + 1).toLocaleString()}–
              {Math.min(page * limit, totalItems).toLocaleString()} of{' '}
              {totalItems.toLocaleString()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
