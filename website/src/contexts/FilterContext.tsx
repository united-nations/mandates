'use client'

import {
  createContext,
  useContext,
  useMemo,
  useTransition,
  ReactNode,
  Suspense,
} from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  parseSearchParams,
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

  const setFilter = (key: FilterParamKey, value: string | undefined) => {
    const newParams = new URLSearchParams(searchParams.toString())

    if (value === undefined || value === '' || value === 'all') {
      newParams.delete(key)
    } else {
      newParams.set(key, value)
    }

    if (key !== 'page' && key !== 'limit') {
      newParams.delete('page')
    }

    const newUrl = `${pathname}?${newParams.toString()}`
    startTransition(() => {
      router.push(newUrl, { scroll: false })
    })
  }

  const setMultipleFilters = (updates: Partial<FilterType>) => {
    const newParams = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === 'all') {
        newParams.delete(key)
      } else {
        newParams.set(key, value)
      }
    })

    const newUrl = `${pathname}?${newParams.toString()}`
    startTransition(() => {
      router.push(newUrl, { scroll: false })
    })
  }

  const clearFilter = (key: FilterParamKey) => {
    setFilter(key, undefined)
  }

  const clearAllFilters = () => {
    const newParams = new URLSearchParams()

    const mode = searchParams.get('mode')
    const ppbVersion = searchParams.get('ppb_version')
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')
    if (mode) newParams.set('mode', mode)
    if (ppbVersion) newParams.set('ppb_version', ppbVersion)
    if (page && page !== '1') newParams.set('page', page)
    if (limit) newParams.set('limit', limit)

    startTransition(() => {
      router.push(`${pathname}?${newParams.toString()}`, { scroll: false })
    })
  }

  const contextValue: FilterContextType = {
    filters,
    isPending,
    setFilter,
    setMultipleFilters,
    clearFilter,
    clearAllFilters,
  }

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
