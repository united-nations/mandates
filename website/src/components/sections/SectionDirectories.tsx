'use client'

import { useMemo } from 'react'

import { EntitiesDirectory } from '@/components/EntitiesDirectory'
import { OrgansDirectory } from '@/components/OrgansDirectory'
import { useFilters } from '@/contexts/FilterContext'
import type {
  BudgetStream,
  DirectoryFilterKey,
  DirectorySelection,
  OrganGroup,
} from '@/types'

const MANDATES_ANCHOR = 'mandates'

/**
 * The selection adapter for a directory rendered INLINE in a page section,
 * rather than inside one of DirectoryExplorer's modals.
 *
 * The two behave differently on purpose, and the difference is the same one
 * hooks/use-section-filter.ts already draws:
 *
 *  - In a modal, a selection is ADDITIVE and pins the panel's scope, because
 *    each panel's counts were computed under that scope (see the invariant
 *    documented on DIMENSION_GROUPS in DirectoryExplorer).
 *  - In a section, a selection REPLACES the filter set — clicking an entity in
 *    the entities section means "show me this entity's mandates", not "add this
 *    to what I already had". setOnlyFilter gives exactly that, so there is no
 *    dimension-group bookkeeping to duplicate here and nothing to drift.
 *
 * Both then scroll to the explorer, which is why the #mandates anchor sits on
 * the section banner, outside the Suspense boundary, and is always in the DOM.
 */
function useSectionSelection(): DirectorySelection {
  const { filters, setOnlyFilter } = useFilters()

  return useMemo(
    () => ({
      active: (key: DirectoryFilterKey) => filters[key],
      select: (key: DirectoryFilterKey, value: string) => {
        const isActive = filters[key] === value
        setOnlyFilter(key, isActive ? undefined : value)
        if (!isActive) {
          requestAnimationFrame(() => {
            document
              .getElementById(MANDATES_ANCHOR)
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          })
        }
      },
    }),
    [filters, setOnlyFilter]
  )
}

export function SectionOrgansDirectory({ groups }: { groups: OrganGroup[] }) {
  const selection = useSectionSelection()
  return <OrgansDirectory groups={groups} selection={selection} />
}

export function SectionEntitiesDirectory({
  streams,
}: {
  streams: BudgetStream[]
}) {
  const selection = useSectionSelection()
  return <EntitiesDirectory streams={streams} selection={selection} />
}
