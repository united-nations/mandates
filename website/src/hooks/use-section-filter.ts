'use client'

import { useCallback } from 'react'
import { useFilters } from '@/contexts/FilterContext'

const MANDATES_ANCHOR = 'mandates'

type SectionFilterKey =
  | 'organ'
  | 'entity'
  | 'subject'
  | 'budget_document'
  | 'budget_part'
  | 'section'

/**
 * Cross-section directory selection. Clicking an organ / entity / subject — or
 * a budget part / section heading — in the directory sections sets a clean
 * single-facet view of the mandates (replacing any other active filters) and
 * smooth-scrolls to the mandate explorer. Clicking the already-active value
 * clears it. Returns the active value for `key` so the directory can highlight
 * its current selection.
 */
export function useSectionFilter(key: SectionFilterKey) {
  const { filters, setOnlyFilter } = useFilters()
  const active = filters[key]

  const select = useCallback(
    (value: string) => {
      const isActive = active === value
      setOnlyFilter(key, isActive ? undefined : value)
      if (!isActive) {
        // The #mandates banner renders outside the explorer's Suspense
        // boundary, so it is always in the DOM and we can scroll immediately.
        requestAnimationFrame(() => {
          document
            .getElementById(MANDATES_ANCHOR)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
    },
    [active, key, setOnlyFilter]
  )

  return { active, select }
}
