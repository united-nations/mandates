'use client'

import { useCallback, useMemo, useState } from 'react'

import type { BudgetTreeLevel } from '@/components/table/BudgetStreamTree'
import { useFilters } from '@/contexts/FilterContext'
import type { FilterParamKey } from '@/lib/filter-constants'
import type { DirectorySelection, FilterOptions } from '@/types'

import { BUDGET_LEVEL_PARAM, DIMENSION_GROUPS } from './constants'
import type { DirectoryPanel, PanelActions } from './types'
import { useDirectoryData } from './use-directory-data'

const scrollToMandates = () =>
  requestAnimationFrame(() =>
    document
      .getElementById('mandates')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  )

const clearDimension = (
  param: FilterParamKey,
  updates: Record<string, string | undefined>
) => {
  for (const group of DIMENSION_GROUPS) {
    if (!group.includes(param)) continue
    for (const key of group) updates[key] = undefined
  }
}

const useApplySelection = (
  setFilters: (updates: Partial<FilterOptions>) => void
) =>
  useCallback(
    (param: FilterParamKey, value: string | undefined) => {
      const updates: Record<string, string | undefined> = {}
      clearDimension(param, updates)
      updates[param] = value
      updates.page = undefined
      setFilters(updates)
      if (value !== undefined) scrollToMandates()
    },
    [setFilters]
  )

const useSelection = (
  filters: FilterOptions,
  apply: ReturnType<typeof useApplySelection>,
  close: () => void
) =>
  useMemo<DirectorySelection>(
    () => ({
      active: (key) => filters[key],
      select: (key, value) => {
        apply(key, filters[key] === value ? undefined : value)
        close()
      },
    }),
    [filters, apply, close]
  )

/** Owns filter writes, dialog state, and lazy directory loading. */
export const useExplorerActions = () => {
  const { filters, setMultipleFilters } = useFilters()
  const [panel, setPanel] = useState<DirectoryPanel | null>(null)
  const directories = useDirectoryData(panel)
  const loadDirectories = directories.load
  const close = useCallback(() => setPanel(null), [])
  const apply = useApplySelection(setMultipleFilters)
  const selection = useSelection(filters, apply, close)
  const openPanel = useCallback(
    (next: DirectoryPanel) => {
      setPanel(next)
      void loadDirectories(next)
    },
    [loadDirectories]
  )
  const selectBudgetLocation = (level: BudgetTreeLevel, value: string) => {
    const param = BUDGET_LEVEL_PARAM[level]
    apply(param, filters[param] === value ? undefined : value)
    close()
  }
  const actions: PanelActions = {
    close,
    selectBudgetLocation,
    selection,
    setCited: (cited) =>
      setMultipleFilters({ cited: cited ? '1' : undefined, page: undefined }),
    setVersion: (slug) =>
      setMultipleFilters({ ppb_version: slug, page: undefined }),
  }
  return { actions, directories, filters, openPanel, panel }
}
