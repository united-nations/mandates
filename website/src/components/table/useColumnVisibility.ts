'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { useFilters } from '@/contexts/FilterContext'
import type { FilterParamKey } from '@/lib/filter-constants'
import { COLUMN_DEFINITIONS, DEFAULT_VISIBLE_COLUMNS } from './MandateColumns'

const STORAGE_KEY = 'mandate-table-columns-v2'

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

export function useColumnVisibility() {
  const { clearFilter } = useFilters()
  const visibleColumns = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  const handleToggleColumn = useCallback(
    (columnId: string) => {
      const prev = getSnapshot()
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
        const col = COLUMN_DEFINITIONS.find((c) => c.id === columnId)
        if (col?.filterParam) {
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
