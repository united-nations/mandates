'use client'

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChipCount } from '@/components/ui/chip'
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
          {/* One count treatment, shared with every chip in the app. The old
              blue pill had horizontal padding and no vertical padding at all,
              so it rendered as a squashed ellipse. */}
          {extraCount > 0 && <ChipCount>{extraCount}</ChipCount>}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      {/* align="end": the trigger sits at the right end of the toolbar, so an
          "start"-aligned menu overhangs the content column into the page
          margin. */}
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs">
          Columns to show
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {TOGGLEABLE_COLUMNS.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.id}
            checked={visibleColumns.has(col.id)}
            // Keep the menu open: toggling several columns in a row is the
            // normal case, and Radix closes on select by default.
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={() => onToggle(col.id)}
            className="cursor-pointer"
          >
            {col.label}
          </DropdownMenuCheckboxItem>
        ))}
        {hasCustomization && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onReset}
              className="cursor-pointer text-xs text-muted-foreground focus:text-foreground"
            >
              Reset to defaults
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
