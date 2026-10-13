'use client'

import { useCallback, useMemo, useState } from 'react'

import type { BudgetTreeLevel } from '@/components/table/BudgetStreamTree'
import { useFilters } from '@/contexts/FilterContext'
import type { FilterParamKey } from '@/lib/filter-constants'
import type { DirectorySelection, FilterOptions } from '@/types'

import { BUDGET_LEVEL_PARAM, DIMENSION_GROUPS } from './constants'
import type {
  DirectoryPanel,
  PanelActions,
  PanelChoice,
  PanelProgress,
} from './types'
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

/**
 * Shows the reader their own click while the navigation that applies it is
 * still running.
 *
 * Every control in these panels writes the URL, and the write goes through a
 * transition, so neither the query string nor the server-rendered figures move
 * until the new page is ready - reported at around three seconds on this page.
 * Without this the button the reader pressed simply does not respond for that
 * whole time.
 *
 * A request only ever stands in for the wait it started. It is dropped the
 * moment the committed value moves, which covers both the navigation landing
 * and the reader leaving by some other route - a back button that returns to
 * the budget they switched away from must not find a months-old click still
 * on file and report it as in progress. A transition that ends without moving
 * the committed value drops it too, through `isPending`.
 */
const useRequested = <T extends string | boolean>(
  committed: T,
  isPending: boolean
) => {
  const [requested, request] = useState<T | null>(null)
  const [answered, setAnswered] = useState(committed)
  if (answered !== committed) {
    setAnswered(committed)
    request(null)
  }
  const pending = isPending && requested !== null && requested !== committed
  return { pending, request, value: pending ? (requested as T) : committed }
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
export const useExplorerActions = (activeVersionSlug: string) => {
  const { filters, isPending, setMultipleFilters } = useFilters()
  const [panel, setPanel] = useState<DirectoryPanel | null>(null)
  const directories = useDirectoryData(panel)
  const loadDirectories = directories.load
  const close = useCallback(() => setPanel(null), [])
  const apply = useApplySelection(setMultipleFilters)
  const selection = useSelection(filters, apply, close)
  const version = useRequested(activeVersionSlug, isPending)
  const cited = useRequested(filters.cited === '1', isPending)
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
    setCited: (next) => {
      cited.request(next)
      setMultipleFilters({ cited: next ? '1' : undefined, page: undefined })
    },
    setVersion: (slug) => {
      version.request(slug)
      setMultipleFilters({ ppb_version: slug, page: undefined })
    },
  }
  const choice: PanelChoice = { cited: cited.value, version: version.value }
  // One wait, not two. A version switch has two halves - the navigation that
  // moves the page's own figures, then the request for the hierarchy that goes
  // with them - and the reader should see them as one.
  const progress: PanelProgress = {
    empty: directories.empty,
    error: directories.error,
    pending: directories.pending || version.pending,
  }
  return {
    actions,
    choice,
    data: directories.data,
    filters,
    openPanel,
    panel,
    progress,
  }
}
