'use client'

import { Check, ChevronDown, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { ChipCount } from '@/components/ui/chip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  ADDABLE_SUMMARY_COLUMNS,
  type DirectorySummaryColumn,
} from './DirectorySummaryColumns'

interface Props {
  /** The addable column ids currently switched on. */
  added: ReadonlySet<string>
  onToggle: (columnId: string) => void
  onReset: () => void
}

/**
 * The registry's column control: a short add-list, and a reset beside it.
 *
 * NOT `components/table/ColumnPicker`, and the difference is worth stating
 * because that one was read first. It takes its column list from
 * `MandateColumns`, calls `useFilters()` for the per-column filter fly-outs,
 * and is handed a `ColumnFacetSources` to build them from. This page has no
 * FilterContext above it, no facets and no per-column filters, so reusing it
 * would mean standing up a filter provider for a table with no filters and
 * then passing empty facets into panels that never open. What IS reused is
 * everything underneath: the same Popover primitive, the same ChipCount for
 * the badge, the same trigger treatment, and the same arrangement of a check
 * column beside a label — so the two controls look and behave alike without one
 * of them carrying the other's dependencies.
 *
 * A Popover rather than a DropdownMenu for the same reason the other one is:
 * the vendored menu answers keystrokes with typeahead and moves the selection
 * under the reader.
 *
 * The reset is out here in the toolbar rather than at the foot of the menu.
 * This page has no sign-in, so a reader who has switched columns on has no
 * account to have done it in and no history to reason from — the way back has
 * to be on the page, not behind the control that got them there. Disabled
 * while the table is already at its defaults, which is most of the time, so it
 * says what it would do without pretending there is something to undo.
 */
export function DirectorySummaryColumnPicker({
  added,
  onToggle,
  onReset,
}: Props) {
  if (ADDABLE_SUMMARY_COLUMNS.length === 0) return null

  const count = ADDABLE_SUMMARY_COLUMNS.filter((column) =>
    added.has(column.id)
  ).length

  return (
    <div className="flex items-center gap-1.5">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            More columns
            {count > 0 && <ChipCount>{count}</ChipCount>}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-60 p-1">
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            Columns to add
          </p>
          {ADDABLE_SUMMARY_COLUMNS.map((column) => (
            <ColumnRow
              key={column.id}
              column={column}
              added={added.has(column.id)}
              onToggle={() => onToggle(column.id)}
            />
          ))}
        </PopoverContent>
      </Popover>

      <button
        type="button"
        onClick={onReset}
        disabled={count === 0}
        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-default disabled:text-muted-foreground disabled:hover:bg-transparent"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset to defaults
      </button>
    </div>
  )
}

function ColumnRow({
  column,
  added,
  onToggle,
}: {
  column: DirectorySummaryColumn
  added: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={added}
      onClick={onToggle}
      className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {added && <Check className="size-4" />}
      </span>
      {column.label}
    </button>
  )
}
