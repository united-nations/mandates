'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useFilters } from '@/contexts/FilterContext'
import { useDirectorySelect } from '@/contexts/DirectorySelectContext'
import { useFilterTarget } from '@/contexts/FilterTargetContext'

const MANDATES_ANCHOR = 'mandates'

type SectionFilterKey =
  | 'organ'
  | 'entity'
  | 'subject'
  | 'budget_document'
  | 'budget_part'
  | 'section'
  | 'subprogramme'

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
  // Present only when the directory is rendered inside an explore modal; lets
  // the selection close that modal so the filtered table is visible.
  const { onSelect: onModalSelect } = useDirectorySelect()
  // Present only on a page whose selections should filter the main table
  // elsewhere (the analytics page); makes select navigate there instead.
  const target = useFilterTarget()
  const router = useRouter()
  const active = filters[key]

  const select = useCallback(
    (value: string) => {
      const isActive = active === value

      if (target) {
        // Off-page (analytics): navigate to the main table with just this
        // facet, or back to the unfiltered table when toggling it off.
        router.push(
          isActive ? target : `${target}?${key}=${encodeURIComponent(value)}`
        )
        onModalSelect?.()
        return
      }

      setOnlyFilter(key, isActive ? undefined : value)
      if (!isActive) {
        // The #mandates anchor renders outside the explorer's Suspense
        // boundary, so it is always in the DOM and we can scroll immediately.
        requestAnimationFrame(() => {
          document
            .getElementById(MANDATES_ANCHOR)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
      onModalSelect?.()
    },
    [active, key, setOnlyFilter, onModalSelect, target, router]
  )

  return { active, select }
}
