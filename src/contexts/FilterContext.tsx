'use client'

import { createContext, useContext, useState, useEffect, ReactNode, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

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
  sort_by?: string
  page?: string
  limit?: string
}

interface FilterContextType {
  filters: FilterType
  setFilter: (key: keyof FilterType, value: string | undefined) => void
  setMultipleFilters: (updates: Partial<FilterType>) => void
  clearFilter: (key: keyof FilterType) => void
  clearAllFilters: () => void
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

function FilterProviderInner({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
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
      const filterKeys: (keyof FilterType)[] = [
        'entity', 'organ', 'crossCitingEntity', 'keyword', 'programme', 'subject', 
        'start_year', 'end_year', 'budget_document', 'sort_by', 'page', 'limit'
      ]
      
      filterKeys.forEach(key => {
        const value = searchParams.get(key)
        if (value) {
          newFilters[key] = value
        }
      })
    } else if (isEntityPage || isOrganPage) {
      // Entity/organ pages: Only read additional filters (not implicit ones)
      const additionalFilterKeys: (keyof FilterType)[] = [
        'crossCitingEntity', 'keyword', 'programme', 'subject', 'start_year', 'end_year', 
        'budget_document', 'sort_by', 'page', 'limit'
      ]
      
      additionalFilterKeys.forEach(key => {
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
    
    setFilters(newFilters)
  }, [searchParams, pathname, isMainPage, isEntityPage, isOrganPage])
  
  // Update a single filter and sync to URL
  const setFilter = (key: keyof FilterType, value: string | undefined) => {
    const newParams = new URLSearchParams(searchParams.toString())
    
    if (value === undefined || value === '' || value === 'all') {
      newParams.delete(key)
    } else {
      newParams.set(key, value)
    }
    
    // Always reset pagination when filters change
    if (key !== 'page' && key !== 'limit') {
      newParams.set('page', '1')
    }
    
    // Navigate with new params
    const newUrl = `${pathname}?${newParams.toString()}`;
    router.push(newUrl, { scroll: false })
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
    const newUrl = `${pathname}?${newParams.toString()}`;
    router.push(newUrl, { scroll: false })
  }

  // Clear a single filter
  const clearFilter = (key: keyof FilterType) => {
    setFilter(key, undefined)
  }
  
  // Clear all filters
  const clearAllFilters = () => {
    const newParams = new URLSearchParams()
    
    // Keep only pagination params
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')
    if (page) newParams.set('page', page)
    if (limit) newParams.set('limit', limit)
    
    router.push(`${pathname}?${newParams.toString()}`, { scroll: false })
  }
  
  const contextValue: FilterContextType = {
    filters,
    setFilter,
    setMultipleFilters,
    clearFilter,
    clearAllFilters
  }
  
  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  )
}

export function FilterProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
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