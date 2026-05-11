'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useTransition,
  ReactNode,
  Suspense,
} from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  FILTER_PARAMS,
  ADDITIONAL_FILTER_PARAMS,
  type FilterParamKey,
} from '@/lib/filter-constants'
import { LoadingFallback } from '@/components/LoadingFallback'

export interface FilterType {
  entity?: string
  organ?: string
  crossCitingEntity?: string
  keyword?: string
  programme?: string
  subject?: string
  start_year?: string
  end_year?: string
  budget_document?: string
  document_type?: string
  agenda_item?: string
  sort_by?: string
  page?: string
  limit?: string
}

interface FilterContextType {
  filters: FilterType
  isPending: boolean
  setFilter: (key: FilterParamKey, value: string | undefined) => void
  setMultipleFilters: (updates: Partial<FilterType>) => void
  clearFilter: (key: FilterParamKey) => void
  clearAllFilters: () => void
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

function FilterProviderInner({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Determine page type
  const isMainPage = pathname === '/'
  const isEntityPage = pathname.startsWith('/entity/')
  const isOrganPage = pathname.startsWith('/organ/')

  // Each page starts completely fresh
  const [filters, setFilters] = useState<FilterType>({})

  // Single useEffect to handle both pathname changes and URL params reading
  useEffect(() => {
    const newFilters: FilterType = {}

    if (isMainPage) {
      // Main page: Only read URL params (for filters set on this page)
      FILTER_PARAMS.forEach((key) => {
        const value = searchParams.get(key)
        if (value) {
          newFilters[key] = value
        }
      })
    } else if (isEntityPage || isOrganPage) {
      // Entity/organ pages: Only read additional filters (not implicit ones)
      ADDITIONAL_FILTER_PARAMS.forEach((key) => {
        const value = searchParams.get(key)
        if (value) {
          newFilters[key] = value
        }
      })

      // Only include cross-filters (entity on organ page, organ on entity page)
      if (isEntityPage) {
        const organValue = searchParams.get('organ')
        if (organValue) newFilters.organ = organValue
      } else if (isOrganPage) {
        const entityValue = searchParams.get('entity')
        if (entityValue) newFilters.entity = entityValue
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters(newFilters)
  }, [searchParams, pathname, isMainPage, isEntityPage, isOrganPage])

  // Update a single filter and sync to URL
  const setFilter = (key: FilterParamKey, value: string | undefined) => {
    const newParams = new URLSearchParams(searchParams.toString())

    if (value === undefined || value === '' || value === 'all') {
      newParams.delete(key)
    } else {
      newParams.set(key, value)
    }

    // Always reset pagination when filters change (page 1 is implicit — omit from URL)
    if (key !== 'page' && key !== 'limit') {
      newParams.delete('page')
    }

    // Navigate with new params
    const newUrl = `${pathname}?${newParams.toString()}`
    startTransition(() => {
      router.push(newUrl, { scroll: false })
    })

    // Scroll to top on entity/organ pages when filters change (but not pagination)
    if ((isEntityPage || isOrganPage) && key !== 'page' && key !== 'limit') {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }

  // Update multiple filters atomically
  const setMultipleFilters = (updates: Partial<FilterType>) => {
    const newParams = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === 'all') {
        newParams.delete(key)
      } else {
        newParams.set(key, value)
      }
    })

    // Navigate with new params
    const newUrl = `${pathname}?${newParams.toString()}`
    startTransition(() => {
      router.push(newUrl, { scroll: false })
    })

    // Scroll to top on entity/organ pages when filters change
    if (isEntityPage || isOrganPage) {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }

  // Clear a single filter
  const clearFilter = (key: FilterParamKey) => {
    setFilter(key, undefined)
  }

  // Clear all filters
  const clearAllFilters = () => {
    const newParams = new URLSearchParams()

    // Keep only pagination params (skip page 1 — it's the implicit default)
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')
    if (page && page !== '1') newParams.set('page', page)
    if (limit) newParams.set('limit', limit)

    startTransition(() => {
      router.push(`${pathname}?${newParams.toString()}`, { scroll: false })
    })

    // Scroll to top on entity/organ pages when filters are cleared
    if (isEntityPage || isOrganPage) {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
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
