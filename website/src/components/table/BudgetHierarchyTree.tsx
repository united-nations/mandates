'use client'

import { SearchInput } from '@/components/SearchInput'
import {
  BudgetStreamTree,
  type BudgetTreeLevel,
} from '@/components/table/BudgetStreamTree'
import { useFilters } from '@/contexts/FilterContext'
import type { FilterParamKey } from '@/lib/filter-constants'
import { FOUNDATIONAL_LABEL, FOUNDATIONAL_TOOLTIP } from '@/lib/foundational'
import type {
  BudgetStream,
  BudgetPartNode,
  BudgetPkoGroupNode,
  FilterOptions,
} from '@/types'
import { useMemo, useState } from 'react'

/**
 * The budget hierarchy as the table's column filter: search + foundational
 * toggle around the shared <BudgetStreamTree>. Clicking a node filters the
 * table to the documents cited there; clicking the active node again clears it.
 */

interface BudgetHierarchyTreeProps {
  hierarchy: BudgetStream[]
}

/** Which filter param each selectable level writes to. */
const LEVEL_PARAM: Record<BudgetTreeLevel, FilterParamKey> = {
  stream: 'budget_document',
  part: 'budget_part',
  section: 'section',
  entity: 'entity',
  subprogramme: 'subprogramme',
}

/**
 * Every budget-location filter param. The tree is single-select: picking any
 * node clears all of these except the one it sets, so at most one budget
 * location applies at a time. `programme` is legacy (superseded by section, only
 * reachable via old ?programme= links) but cleared for cleanliness. `foundational`
 * is deliberately excluded — it is a cross-cutting toggle, not a location.
 */
const BUDGET_LOCATION_PARAMS: FilterParamKey[] = [
  'budget_document',
  'budget_part',
  'section',
  'entity',
  'subprogramme',
  'programme',
]

export function BudgetHierarchyTree({ hierarchy }: BudgetHierarchyTreeProps) {
  const { filters, setFilter, clearFilter, setMultipleFilters } = useFilters()
  const [search, setSearch] = useState('')

  const active = {
    stream: filters.budget_document,
    part: filters.budget_part,
    section: filters.section,
    entity: filters.entity,
    subprogramme: filters.subprogramme,
  }

  const matches = useMemo(
    () => filterHierarchy(hierarchy, search.trim().toLowerCase()),
    [hierarchy, search]
  )

  const searching = search.trim().length > 0

  const select = (level: BudgetTreeLevel, value: string) => {
    const param = LEVEL_PARAM[level]
    if (active[level] === value) {
      clearFilter(param)
      return
    }
    // Single-select: picking any node replaces the entire budget-location
    // selection, so only one applies at a time (never an empty intersection of
    // conflicting levels or streams).
    const updates: Partial<FilterOptions> = { [param]: value }
    for (const other of BUDGET_LOCATION_PARAMS) {
      if (other !== param) updates[other] = undefined
    }
    setMultipleFilters(updates)
  }

  if (hierarchy.length === 0) {
    return (
      <p className="py-2 text-xs text-muted-foreground">
        No budget locations for the current filters.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <SearchInput
        placeholder="Search streams, parts, entities..."
        value={search}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setSearch(e.target.value)
        }
        variant="border-bottom"
      />

      {/* Cuts across the tree rather than sitting in it: a citation is
          foundational or not at every level at once. */}
      <label
        className="flex cursor-pointer items-center gap-2 text-xs"
        title={FOUNDATIONAL_TOOLTIP}
      >
        <input
          type="checkbox"
          checked={filters.foundational === 'true'}
          onChange={(e) =>
            e.target.checked
              ? setFilter('foundational', 'true')
              : clearFilter('foundational')
          }
          className="h-3.5 w-3.5 accent-un-blue-deep"
        />
        <span>{FOUNDATIONAL_LABEL} mandates only</span>
      </label>

      <div className="max-h-[420px] overflow-y-auto">
        {matches.length > 0 ? (
          <BudgetStreamTree
            hierarchy={matches}
            active={active}
            onSelect={select}
            forceExpandAll={searching}
          />
        ) : (
          <p className="py-2 text-xs text-muted-foreground">No matches.</p>
        )}
      </div>
    </div>
  )
}

/** Keep any branch with a hit at any depth, pruned to the matching children. */
function filterHierarchy(
  hierarchy: BudgetStream[],
  term: string
): BudgetStream[] {
  if (!term) return hierarchy

  const hit = (...values: (string | null)[]) =>
    values.some((v) => v?.toLowerCase().includes(term))

  return hierarchy
    .map((stream): BudgetStream | null => {
      if (hit(stream.label)) return stream

      if (stream.type === 'ppb') {
        const parts = filterParts(stream.parts, hit)
        return parts.length > 0 ? { ...stream, parts } : null
      }

      if (stream.type === 'pko') {
        const groups = stream.groups
          .map((group) => {
            if (hit(group.label)) return group
            const entities = group.entities.filter((e) =>
              hit(e.entity, e.entity_long)
            )
            return entities.length > 0 ? { ...group, entities } : null
          })
          .filter((g): g is BudgetPkoGroupNode => g !== null)
        return groups.length > 0 ? { ...stream, groups } : null
      }

      // plan_outline is a leaf: it only matches on its own label (handled above)
      return null
    })
    .filter((s): s is BudgetStream => s !== null)
}

function filterParts(
  parts: BudgetPartNode[],
  hit: (...values: (string | null)[]) => boolean
): BudgetPartNode[] {
  return parts
    .map((part) => {
      if (hit(part.part, part.part_title)) return part

      const sections = part.sections
        .map((section) => {
          if (
            hit(section.section, section.section_title, section.programme_title)
          ) {
            return section
          }
          const entities = section.entities.filter(
            (entity) =>
              hit(entity.entity, entity.entity_long) ||
              entity.subprogrammes.some((sp) => hit(sp.subprogramme))
          )
          return entities.length > 0 ? { ...section, entities } : null
        })
        .filter((s) => s !== null)

      return sections.length > 0 ? { ...part, sections } : null
    })
    .filter((p) => p !== null)
}
