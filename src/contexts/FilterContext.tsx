'use client'

import { createContext, useContext, useState, useEffect, ReactNode, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export interface FilterType {
  entity?: string
  organ?: string
  keyword?: string
  programme?: string
  subject?: string
  start_year?: string
  end_year?: string
  budget_document?: string
  cross_entity?: string
  cross_organ?: string
  sort_by?: string
  page?: string
  limit?: string
}

interface FilterContextType {
  filters: FilterType
  setFilter: (key: keyof FilterType, value: string | undefined) => void
  clearFilter: (key: keyof FilterType) => void
  clearAllFilters: () => void
  // Page context helpers
  isEntityPage: boolean
  isOrganPage: boolean
  isMainPage: boolean
  currentEntityName?: string
  currentOrganName?: string
  // Helper to get display-ready filters (excludes implicit filters)
  getDisplayFilters: () => FilterType
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

function FilterProviderInner({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Detect page context
  const isEntityPage = pathname?.startsWith('/entity/')
  const isOrganPage = pathname?.startsWith('/organ/')
  const isMainPage = pathname === '/'
  
  // Extract current entity/organ from path if on those pages
  const currentEntityName = isEntityPage ? decodeURIComponent(pathname?.split('/')[2] || '') : undefined
  const currentOrganName = isOrganPage ? decodeURIComponent(pathname?.split('/')[2] || '') : undefined
  
  // Initialize filters from URL params
  const [filters, setFilters] = useState<FilterType>({})
  
  // Sync URL params to state whenever they change
  useEffect(() => {
    const newFilters: FilterType = {}
    
    // Read all possible filter params from URL
    const filterKeys: (keyof FilterType)[] = [
      'entity', 'organ', 'keyword', 'programme', 'subject', 
      'start_year', 'end_year', 'budget_document', 'cross_entity', 
      'cross_organ', 'sort_by', 'page', 'limit'
    ]
    
    filterKeys.forEach(key => {
      const value = searchParams.get(key)
      if (value) {
        newFilters[key] = value
      }
    })
    
    // Add implicit filters based on page context
    if (isEntityPage && currentEntityName) {
      newFilters.entity = currentEntityName
    }
    if (isOrganPage && currentOrganName) {
      newFilters.organ = currentOrganName
    }
    
    setFilters(newFilters)
  }, [searchParams, pathname, isEntityPage, isOrganPage, currentEntityName, currentOrganName])
  
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
    router.push(`${pathname}?${newParams.toString()}`, { scroll: false })
  }
  
  // Clear a single filter
  const clearFilter = (key: keyof FilterType) => {
    setFilter(key, undefined)
  }
  
  // Clear all filters while preserving page context
  const clearAllFilters = () => {
    const newParams = new URLSearchParams()
    
    // Keep only pagination params
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')
    if (page) newParams.set('page', page)
    if (limit) newParams.set('limit', limit)
    
    router.push(`${pathname}?${newParams.toString()}`, { scroll: false })
  }
  
  // Get filters that should be displayed as chips (excludes implicit page context filters)
  const getDisplayFilters = (): FilterType => {
    const displayFilters = { ...filters }
    
    // Remove implicit filters based on page context
    if (isEntityPage && displayFilters.entity === currentEntityName) {
      delete displayFilters.entity
    }
    if (isOrganPage && displayFilters.organ === currentOrganName) {
      delete displayFilters.organ
    }
    
    // Remove pagination and sorting from display
    delete displayFilters.page
    delete displayFilters.limit
    delete displayFilters.sort_by
    
    return displayFilters
  }
  
  const contextValue: FilterContextType = {
    filters,
    setFilter,
    clearFilter,
    clearAllFilters,
    isEntityPage,
    isOrganPage,
    isMainPage,
    currentEntityName,
    currentOrganName,
    getDisplayFilters
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