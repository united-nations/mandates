'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

import { useFilters } from '@/contexts/FilterContext'
import { useFilterTarget } from '@/contexts/FilterTargetContext'
import type { FilterOptions } from '@/types'

/**
 * A drop-in replacement for `useFilters().setMultipleFilters` that honours an
 * optional {@link FilterTargetContext}. When a target path is set (the
 * analytics page), the selection navigates to that path with the given facets
 * as a fresh query, so the main mandate table filters. Otherwise it defers to
 * the in-page FilterContext, so behaviour on /secretariat is unchanged.
 */
export function useCrossPageFilters(): (
  updates: Partial<FilterOptions>
) => void {
  const { setMultipleFilters } = useFilters()
  const target = useFilterTarget()
  const router = useRouter()

  return useCallback(
    (updates: Partial<FilterOptions>) => {
      if (!target) {
        setMultipleFilters(updates)
        return
      }
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && value !== '' && value !== 'all') {
          params.set(key, String(value))
        }
      }
      router.push(`${target}?${params.toString()}`)
    },
    [target, router, setMultipleFilters]
  )
}
