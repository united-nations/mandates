'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';

export interface FilterParams {
  entity?: string;
  organ?: string;
  keyword?: string;
  programme?: string;
  subject?: string;
  start_year?: string;
  end_year?: string;
  budget_document?: string;
  cross_entity?: string;
  cross_organ?: string;
  sort_by?: string;
  page?: string;
  limit?: string;
}

export function useUrlFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // Get current filters from URL
  const filters = Object.fromEntries(
    Array.from(searchParams.entries())
  ) as FilterParams;
  
  // Update a single filter
  const setFilter = useCallback((key: keyof FilterParams, value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value === undefined || value === '' || value === 'all') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    
    // Reset to page 1 when filters change (except for page and limit)
    if (key !== 'page' && key !== 'limit') {
      params.set('page', '1');
    }
    
    // Navigate to new URL
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);
  
  // Update multiple filters at once
  const setFilters = useCallback((newFilters: Partial<FilterParams>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    
    // Reset to page 1 when filters change
    params.set('page', '1');
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);
  
  // Clear a single filter
  const clearFilter = useCallback((key: keyof FilterParams) => {
    setFilter(key, undefined);
  }, [setFilter]);
  
  // Clear all filters
  const clearAllFilters = useCallback(() => {
    const params = new URLSearchParams();
    
    // Keep only pagination params
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);
  
  return {
    filters,
    setFilter,
    setFilters,
    clearFilter,
    clearAllFilters,
  };
}
