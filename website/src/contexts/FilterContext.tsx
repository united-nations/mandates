'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useTransition,
  ReactNode,
  Suspense,
} from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  parseSearchParams,
  CONTROL_PARAMS,
  type FilterParamKey,
} from '@/lib/filter-constants'
import type { FilterOptions } from '@/types'
import { LoadingFallback } from '@/components/LoadingFallback'

/**
 * Filter state is the URL. We derive it directly from searchParams via the
 * shared parseSearchParams (the same parser the server uses) — no useState
 * mirror, so there is a single source of truth and no URL/state lag.
 */
export type FilterType = FilterOptions

interface FilterContextType {
  filters: FilterOptions
  isPending: boolean
  setFilter: (key: FilterParamKey, value: string | undefined) => void
  setMultipleFilters: (updates: Partial<FilterOptions>) => void
  clearFilter: (key: FilterParamKey) => void
  clearAllFilters: () => void
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

function FilterProviderInner({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const filters = useMemo(
    () => parseSearchParams(Object.fromEntries(searchParams.entries())),
    [searchParams]
  )

  // Single place that pushes a new URL: every mutator builds its params then
  // hands them here, so the transition + scroll behaviour lives once.
  const applyParams = useCallback(
    (next: URLSearchParams) => {
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`, { scroll: false })
      })
    },
    [pathname, router]
  )

  // The shared "empty value means remove" rule used by setFilter/setMultiple.
  const writeParam = (
    params: URLSearchParams,
    key: string,
    value: string | undefined
  ) => {
    if (value === undefined || value === '' || value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
  }

  const setFilter = useCallback(
    (key: FilterParamKey, value: string | undefined) => {
      const newParams = new URLSearchParams(searchParams.toString())
      writeParam(newParams, key, value)

      // Any filter change resets pagination; page/limit changes do not.
      if (key !== 'page' && key !== 'limit') {
        newParams.delete('page')
      }

      applyParams(newParams)
    },
    [searchParams, applyParams]
  )

  const setMultipleFilters = useCallback(
    (updates: Partial<FilterType>) => {
      const newParams = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        writeParam(newParams, key, value)
      })
      applyParams(newParams)
    },
    [searchParams, applyParams]
  )

  const clearFilter = useCallback(
    (key: FilterParamKey) => {
      setFilter(key, undefined)
    },
    [setFilter]
  )

  const clearAllFilters = useCallback(() => {
    const newParams = new URLSearchParams()

    // "Clear all" drops every filter but preserves the control params (view
    // mode, budget version, pagination) — i.e. CONTROL_PARAMS except sort_by,
    // which is treated as a filter for this purpose. Deriving the set from
    // CONTROL_PARAMS means a new control param can't be silently wiped here.
    const PRESERVED = CONTROL_PARAMS.filter((p) => p !== 'sort_by')
    for (const key of PRESERVED) {
      const value = searchParams.get(key)
      if (!value) continue
      // Match prior behaviour: a default page=1 is not carried over.
      if (key === 'page' && value === '1') continue
      newParams.set(key, value)
    }

    applyParams(newParams)
  }, [searchParams, applyParams])

  const contextValue: FilterContextType = useMemo(
    () => ({
      filters,
      isPending,
      setFilter,
      setMultipleFilters,
      clearFilter,
      clearAllFilters,
    }),
    [
      filters,
      isPending,
      setFilter,
      setMultipleFilters,
      clearFilter,
      clearAllFilters,
    ]
  )

  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  )
}

export function FilterProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <FilterProviderInner>{children}</FilterProviderInner>
    </Suspense>
  )
}

export const useFilters = () => {
  const context = useContext(FilterContext)
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider')
  }
  return context
}
