'use client'

import { ChipCount } from '@/components/ui/chip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useFilters } from '@/contexts/FilterContext'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, Filter, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { ColumnFilterBody } from './ColumnHeaderFilter'
import {
  getColumnFilterGroups,
  getColumnFilterOptions,
  type ColumnFacetSources,
} from './columnFacets'
import {
  DEFAULT_VISIBLE_COLUMNS,
  isColumnFilterActive,
  TOGGLEABLE_COLUMNS,
  type ColumnDef,
} from './MandateColumns'

interface ColumnPickerProps {
  visibleColumns: Set<string>
  onToggle: (columnId: string) => void
  onReset: () => void
  /** Facet lists for the per-column filters, same source as the table header. */
  facets: ColumnFacetSources
}

/**
 * Lives in the explorer toolbar (next to "Group versions" and the scope
 * toggle), not in the table header: the table defaults to a handful of columns,
 * so the way to get the others back has to be visible without hunting for an
 * icon.
 *
 * It carries the filters too, not just the visibility switches. A column's
 * filter used to be reachable only from its own header, which meant filtering
 * by, say, document type began with knowing that a Document type column exists
 * and switching it on. Here every column names itself and opens its filter in
 * place; setting one switches its column on (see useColumnVisibility), so the
 * table always shows what it has been narrowed by.
 *
 * A Popover, not a DropdownMenu: the pill filters contain a search box, and a
 * Radix menu answers keystrokes with typeahead instead of letting them reach
 * the input.
 */
export function ColumnPicker({
  visibleColumns,
  onToggle,
  onReset,
  facets,
}: ColumnPickerProps) {
  const { filters } = useFilters()
  const [openFilter, setOpenFilter] = useState<string | null>(null)

  const hasCustomization = TOGGLEABLE_COLUMNS.some(
    (col) => visibleColumns.has(col.id) !== DEFAULT_VISIBLE_COLUMNS.has(col.id)
  )

  // Count of columns switched on beyond the minimal default, so the control
  // reports its own state rather than looking inert once it has been used.
  const extraCount = TOGGLEABLE_COLUMNS.filter(
    (col) => visibleColumns.has(col.id) && !DEFAULT_VISIBLE_COLUMNS.has(col.id)
  ).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-gray-100 px-2.5 text-sm font-medium whitespace-nowrap text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 data-[state=open]:bg-gray-200 data-[state=open]:text-gray-900"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          More columns and filters
          {/* One count treatment, shared with every chip in the app. */}
          {extraCount > 0 && <ChipCount>{extraCount}</ChipCount>}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </PopoverTrigger>
      {/* align="end": the trigger sits at the right end of the toolbar, so an
          "start"-aligned menu overhangs the content column into the page
          margin. */}
      <PopoverContent align="end" className="w-80 p-1">
        <p className="px-2 py-1.5 text-xs text-muted-foreground">
          Columns to show, and their filters
        </p>
        <div className="max-h-[60vh] overflow-y-auto">
          {TOGGLEABLE_COLUMNS.map((col) => (
            <ColumnRow
              key={col.id}
              column={col}
              visible={visibleColumns.has(col.id)}
              filtered={isColumnFilterActive(col, filters)}
              filterOpen={openFilter === col.id}
              onToggleVisible={() => onToggle(col.id)}
              onToggleFilter={() =>
                setOpenFilter((current) => (current === col.id ? null : col.id))
              }
              facets={facets}
            />
          ))}
        </div>
        {hasCustomization && (
          <>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={() => {
                setOpenFilter(null)
                onReset()
              }}
              className="w-full cursor-pointer rounded-sm px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Reset to defaults
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

function ColumnRow({
  column,
  visible,
  filtered,
  filterOpen,
  onToggleVisible,
  onToggleFilter,
  facets,
}: {
  column: ColumnDef
  visible: boolean
  filtered: boolean
  filterOpen: boolean
  onToggleVisible: () => void
  onToggleFilter: () => void
  facets: ColumnFacetSources
}) {
  const hasFilter = Boolean(column.filterParam && column.filterType)

  return (
    <div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={visible}
          onClick={onToggleVisible}
          className="flex flex-1 cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-2 pl-2 text-left text-sm hover:bg-accent"
        >
          <span className="flex size-4 shrink-0 items-center justify-center">
            {visible && <Check className="size-4" />}
          </span>
          {column.label}
        </button>
        {hasFilter && (
          <button
            type="button"
            onClick={onToggleFilter}
            aria-expanded={filterOpen}
            aria-label={`Filter by ${column.label}`}
            className={cn(
              'flex size-6 shrink-0 cursor-pointer items-center justify-center rounded transition-colors',
              filtered
                ? 'bg-un-blue text-white'
                : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600',
              filterOpen && !filtered && 'bg-gray-200 text-gray-600'
            )}
          >
            <Filter className="size-3" />
          </button>
        )}
      </div>
      {filterOpen && hasFilter && (
        // Inline, not a nested popover: a popover inside a popover closes the
        // outer one on the first outside-click Radix sees.
        <div className="mt-1 mb-2 ml-6 overflow-x-auto border-l border-gray-200 pl-2">
          <ColumnFilterBody
            column={column}
            options={getColumnFilterOptions(column.id, facets)}
            groups={getColumnFilterGroups(column.id)}
            yearRange={facets.filterOptions.yearRange}
            budgetHierarchy={facets.filterOptions.budgetHierarchy}
          />
        </div>
      )}
    </div>
  )
}
