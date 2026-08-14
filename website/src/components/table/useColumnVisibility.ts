'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useFilters } from '@/contexts/FilterContext'
import type { FilterParamKey } from '@/lib/filter-constants'
import {
  COLUMN_DEFINITIONS,
  DEFAULT_VISIBLE_COLUMNS,
  isColumnFilterActive,
} from './MandateColumns'

// Bumped to v4 when "# Entities" joined the default set: a returning user with
// a stored v3 selection would otherwise never see the new column. (v3 was the
// same move when the default set shrank to symbol + title.)
const STORAGE_KEY = 'mandate-table-columns-v4'

function parseStored(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const ids = JSON.parse(stored) as string[]
      const all = new Set(COLUMN_DEFINITIONS.map((c) => c.id))
      const valid = ids.filter((id) => all.has(id))
      if (valid.length > 0) {
        return new Set(valid)
      }
    }
  } catch {}
  return DEFAULT_VISIBLE_COLUMNS
}

/**
 * localStorage-backed store for column visibility. We cache the snapshot Set so
 * useSyncExternalStore gets a stable reference between renders (it must, or it
 * loops), and only recompute it when the underlying value actually changes.
 */
let cachedSnapshot: Set<string> | null = null
const listeners = new Set<() => void>()

function getSnapshot(): Set<string> {
  if (cachedSnapshot === null) cachedSnapshot = parseStored()
  return cachedSnapshot
}

function getServerSnapshot(): Set<string> {
  return DEFAULT_VISIBLE_COLUMNS
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function commit(columns: Set<string>) {
  cachedSnapshot = columns
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...columns]))
  listeners.forEach((l) => l())
}

function reset() {
  cachedSnapshot = DEFAULT_VISIBLE_COLUMNS
  localStorage.removeItem(STORAGE_KEY)
  listeners.forEach((l) => l())
}

/** Is some visible column already the way in to this filter? */
function showsFilter(
  visible: Set<string>,
  filterParam: string | undefined
): boolean {
  if (!filterParam) return false
  return COLUMN_DEFINITIONS.some(
    (col) => col.filterParam === filterParam && visible.has(col.id)
  )
}

export function useColumnVisibility() {
  const { filters, clearFilter } = useFilters()
  const visibleColumns = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  // A filtered column is always shown. The filter can be set from the
  // columns/filters menu, from a chip in a row, from one of the explore cards
  // or straight from a shared URL — in every one of those a hidden column would
  // leave the table narrowed by something the reader cannot see.
  //
  // One column per filter, though: `entity` belongs to both Entities and
  // # Entities, and # Entities is on by default, so filtering by an entity must
  // not also unfold the wide chip list.
  useEffect(() => {
    const next = new Set(visibleColumns)
    let changed = false
    for (const col of COLUMN_DEFINITIONS) {
      if (!isColumnFilterActive(col, filters)) continue
      if (showsFilter(next, col.filterParam)) continue
      next.add(col.id)
      changed = true
    }
    if (changed) commit(next)
  }, [filters, visibleColumns])

  const handleToggleColumn = useCallback(
    (columnId: string) => {
      const prev = getSnapshot()
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
        const col = COLUMN_DEFINITIONS.find((c) => c.id === columnId)
        // Hiding a column drops its filter — otherwise the table stays narrowed
        // by something no longer on screen, and the effect above would put the
        // column straight back. Unless another visible column is a way in to the
        // same filter (Entities / # Entities share `entity`), in which case the
        // filter is still visible and still editable.
        if (col?.filterParam && !showsFilter(next, col.filterParam)) {
          if (col.filterType === 'yearRange') {
            clearFilter('start_year')
            clearFilter('end_year')
          } else {
            clearFilter(col.filterParam as FilterParamKey)
          }
        }
      } else {
        next.add(columnId)
      }
      commit(next)
    },
    [clearFilter]
  )

  const handleResetColumns = useCallback(() => {
    reset()
  }, [])

  return { visibleColumns, handleToggleColumn, handleResetColumns }
}
