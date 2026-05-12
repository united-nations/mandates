'use client'

import { useCallback, useEffect, useState } from 'react'
import { useFilters } from '@/contexts/FilterContext'
import type { FilterParamKey } from '@/lib/filter-constants'
import { COLUMN_DEFINITIONS, DEFAULT_VISIBLE_COLUMNS } from './MandateColumns'

const STORAGE_KEY = 'mandate-table-columns-v2'

function loadVisibleColumns(): Set<string> {
  if (typeof window === 'undefined') return DEFAULT_VISIBLE_COLUMNS
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

function saveVisibleColumns(columns: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...columns]))
}

export function useColumnVisibility() {
  const { clearFilter } = useFilters()
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS)

  useEffect(() => {
    setVisibleColumns(loadVisibleColumns())
  }, [])

  const handleToggleColumn = useCallback(
    (columnId: string) => {
      setVisibleColumns((prev) => {
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
        saveVisibleColumns(next)
        return next
      })
    },
    [clearFilter]
  )

  const handleResetColumns = useCallback(() => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return { visibleColumns, handleToggleColumn, handleResetColumns }
}
