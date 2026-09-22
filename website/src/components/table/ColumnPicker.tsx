'use client'

import { ChipCount } from '@/components/ui/chip'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useFilters } from '@/contexts/FilterContext'
import { cn } from '@/lib/utils'
import {
  Check,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react'
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
 * Marks the fly-out panels, so the menu can tell a click inside one from a
 * click that should close it (see onInteractOutside below).
 */
const FILTER_PANEL_SELECTOR = '[data-column-filter-panel]'

/**
 * Lives in the explorer toolbar (next to "Group versions" and the scope
 * toggle), not in the table header: the table defaults to a handful of columns,
 * so the way to get the others back has to be visible without hunting for an
 * icon.
 *
 * It carries the filters too, not just the visibility switches. A column's
 * filter used to be reachable only from its own header, which meant filtering
 * by, say, document type began with knowing that a Document type column exists
 * and switching it on. Here every column names itself and its filter folds out
 * sideways on hover, one level further, the way a submenu does; setting one
 * switches its column on (see useColumnVisibility), so the table always shows
 * what it has been narrowed by.
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
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-secondary px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          More columns and filters
          {/* One count treatment, shared with every chip in the app. */}
          {extraCount > 0 && <ChipCount>{extraCount}</ChipCount>}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      {/* align="end": the trigger sits at the right end of the toolbar, so an
          "start"-aligned menu overhangs the content column into the page
          margin. */}
      <PopoverContent
        align="end"
        className="w-64 p-1"
        // A fly-out panel is portalled, so every click in it reads as "outside"
        // and would close the menu under it. This is the one exception.
        onInteractOutside={(event) => {
          const target = event.detail.originalEvent.target
          if (
            target instanceof Element &&
            target.closest(FILTER_PANEL_SELECTOR)
          ) {
            event.preventDefault()
          }
        }}
      >
        <p className="px-2 py-1.5 text-sm text-muted-foreground">
          Columns to show, and their filters
        </p>
        <div className="max-h-[60vh] overflow-y-auto">
          {TOGGLEABLE_COLUMNS.map((col) => (
            <ColumnRow
              key={col.id}
              column={col}
              visible={visibleColumns.has(col.id)}
              filtered={isColumnFilterActive(col, filters)}
              onToggleVisible={() => onToggle(col.id)}
              facets={facets}
            />
          ))}
        </div>
        {hasCustomization && (
          <>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={onReset}
              className="w-full cursor-pointer rounded-sm px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Reset to defaults
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

/**
 * One column: a checkbox for the column itself, and — for the columns that have
 * a filter — a fly-out holding it.
 *
 * The fly-out opens on hover, like a submenu, and also on click so it is not
 * hover-only. It never closes on click: the pill filters are made of chips you
 * click, and a panel that vanished under the pointer would take the second one
 * with it.
 */
function ColumnRow({
  column,
  visible,
  filtered,
  onToggleVisible,
  facets,
}: {
  column: ColumnDef
  visible: boolean
  filtered: boolean
  onToggleVisible: () => void
  facets: ColumnFacetSources
}) {
  const [open, setOpen] = useState(false)
  const hasFilter = Boolean(column.filterParam && column.filterType)

  const row = (
    <div
      className={cn('flex items-center gap-1 rounded-sm', open && 'bg-accent')}
    >
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={visible}
        // Stopped, or switching a column on would also fling its filter panel
        // open: the whole row is the fly-out's hover/click trigger.
        onClick={(event) => {
          event.stopPropagation()
          onToggleVisible()
        }}
        className="flex flex-1 cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
      >
        <span className="flex size-4 shrink-0 items-center justify-center">
          {visible && <Check className="size-4" />}
        </span>
        {column.label}
      </button>
      {hasFilter && (
        <button
          type="button"
          aria-expanded={open}
          aria-label={`Filter by ${column.label}`}
          onClick={() => setOpen(true)}
          className={cn(
            'flex h-6 shrink-0 cursor-pointer items-center gap-0.5 rounded px-1 text-sm transition-colors',
            filtered ? 'text-un-blue-text' : 'text-muted-foreground'
          )}
        >
          {/* The dot is the state: a column whose filter holds a value reads as
              filtered from the closed menu, without opening anything. */}
          {filtered && <span className="size-1.5 rounded-full bg-un-blue" />}
          <ChevronRight className="size-3.5" />
        </button>
      )}
    </div>
  )

  if (!hasFilter) return row

  return (
    <HoverCard
      open={open}
      onOpenChange={setOpen}
      openDelay={150}
      closeDelay={200}
    >
      <HoverCardTrigger asChild>
        {/* The whole row is the hover target, submenu-style: the chevron says
            where the filter is, but nobody should have to hit a 14px target to
            get at it. */}
        <div onClick={() => setOpen(true)}>{row}</div>
      </HoverCardTrigger>
      <HoverCardContent
        data-column-filter-panel=""
        side="left"
        align="start"
        sideOffset={8}
        className={cn(
          'w-auto border bg-white p-3 shadow-lg',
          column.filterType === 'hierarchy' && 'w-[420px]'
        )}
      >
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          Filter by {column.label}
        </p>
        <ColumnFilterBody
          column={column}
          options={getColumnFilterOptions(column.id, facets)}
          groups={getColumnFilterGroups(column.id)}
          yearRange={facets.filterOptions.yearRange}
          budgetHierarchy={facets.filterOptions.budgetHierarchy}
        />
      </HoverCardContent>
    </HoverCard>
  )
}
