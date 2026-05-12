'use client'

import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SlidersHorizontal } from 'lucide-react'
import {
  DEFAULT_VISIBLE_COLUMNS,
  TOGGLEABLE_COLUMNS,
} from './MandateColumns'

interface ColumnPickerProps {
  visibleColumns: Set<string>
  onToggle: (columnId: string) => void
  onReset: () => void
}

export function ColumnPicker({
  visibleColumns,
  onToggle,
  onReset,
}: ColumnPickerProps) {
  const hasCustomization = TOGGLEABLE_COLUMNS.some(
    (col) => visibleColumns.has(col.id) !== DEFAULT_VISIBLE_COLUMNS.has(col.id)
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Toggle columns"
          className="inline-flex items-center justify-center rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs">
          Toggle columns
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
