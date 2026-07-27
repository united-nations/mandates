'use client'

import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { DEFAULT_VISIBLE_COLUMNS, TOGGLEABLE_COLUMNS } from './MandateColumns'

interface ColumnPickerProps {
  visibleColumns: Set<string>
  onToggle: (columnId: string) => void
  onReset: () => void
}

/**
 * Lives in the explorer toolbar (next to "Group versions" and the scope
 * toggle), not in the table header: the table now defaults to two columns, so
 * the way to get the others back has to be visible without hunting for an icon.
 */
export function ColumnPicker({
  visibleColumns,
  onToggle,
  onReset,
}: ColumnPickerProps) {
  const hasCustomization = TOGGLEABLE_COLUMNS.some(
    (col) => visibleColumns.has(col.id) !== DEFAULT_VISIBLE_COLUMNS.has(col.id)
  )

  // Count of columns switched on beyond the minimal default, so the control
  // reports its own state rather than looking inert once it has been used.
  const extraCount = TOGGLEABLE_COLUMNS.filter(
    (col) => visibleColumns.has(col.id) && !DEFAULT_VISIBLE_COLUMNS.has(col.id)
  ).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-gray-100 px-2.5 text-sm font-medium whitespace-nowrap text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 data-[state=open]:bg-gray-200 data-[state=open]:text-gray-900"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          More columns
          {extraCount > 0 && (
            <span className="rounded-full bg-un-blue px-1.5 text-xs font-semibold text-white tabular-nums">
              {extraCount}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel className="text-xs">
          Columns to show
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="p-1">
          {TOGGLEABLE_COLUMNS.map((col) => (
            <label
              key={col.id}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Checkbox
                checked={visibleColumns.has(col.id)}
                onCheckedChange={() => onToggle(col.id)}
              />
              {col.label}
            </label>
          ))}
        </div>
        {hasCustomization && (
          <>
            <DropdownMenuSeparator />
            <button
              onClick={onReset}
              className="w-full px-2 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
            >
              Reset to defaults
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
