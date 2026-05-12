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
  min_citations?: string
  max_citations?: string
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

  const [filters, setFilters] = useState<FilterType>({})

  useEffect(() => {
    const newFilters: FilterType = {}

    FILTER_PARAMS.forEach((key) => {
      const value = searchParams.get(key)
      if (value) {
        newFilters[key] = value
      }
    })

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters(newFilters)
  }, [searchParams, pathname])

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

    const page = searchParams.get('page')
    const limit = searchParams.get('limit')
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
