'use client'

import { EntityBadge, FoundationalTag } from '@/components/EntityBadge'
import { BudgetLocationTree } from '@/components/BudgetLocationTree'
import { TooltipProvider } from '@/components/ui/tooltip'
import { isFoundational } from '@/lib/foundational'
import type { BudgetStream, Entity, Mandate } from '@/types'
import { Building, Network } from 'lucide-react'
import { useMemo, useState } from 'react'

/**
 * Who cites this document, and where in the budget they cite it from.
 *
 * Entities are the unit nearly everyone reasons about, so the flat entity list
 * is the default. The budget structure is a specialist lens, so it is one click
 * away rather than always on screen — the toggle regroups the *same* entities
 * under Part › Section rather than showing anything new.
 *
 * There used to be a second list, "N Programmes Citing this Document". It was
 * the entity list restated: a programme is a strict function of the citing
 * entity, since no entity spans more than one section and every section has
 * exactly one programme. It is gone.
 *
 * The per-entity "2x" counts are gone too. They counted extraction rows, not
 * citation sites: an entity that cites a document in both its "Mandates and
 * background" narrative and its Legislative mandates table produced two rows at
 * the *same* budget location. That fact is now shown as what it actually means
 * — a foundational citation — instead of as an unexplained multiplier.
 */

interface CitationCountsProps {
  mandate: Mandate
  entities: Entity[]
  /** This document's budget hierarchy (getBudgetHierarchy scoped to it). */
  budgetStreams: BudgetStream[]
}

const VISIBLE = 5

export function CitationCounts({
  mandate,
  entities,
  budgetStreams,
}: CitationCountsProps) {
  const [showAll, setShowAll] = useState(false)
  const [groupByBudget, setGroupByBudget] = useState(false)

  const foundationalEntities = mandate.foundational_entities ?? []

  const entityLongNames = useMemo(() => {
    const map = new Map<string, string>()
    entities.forEach((entity) => map.set(entity.entity, entity.entity_long))
    return map
  }, [entities])

  // Distinct citing entities, foundational ones first — they are the ones a
  // reader scanning for "why does this entity exist" wants to see.
  const citingEntities = useMemo(() => {
    const seen = new Set<string>()
    for (const citation of mandate.citation_info ?? []) {
      if (citation.entity) seen.add(citation.entity)
    }
    return [...seen].sort((a, b) => {
      const aFound = foundationalEntities.includes(a)
      const bFound = foundationalEntities.includes(b)
      if (aFound !== bFound) return aFound ? -1 : 1
      return a.localeCompare(b)
    })
  }, [mandate.citation_info, foundationalEntities])

  if (citingEntities.length === 0 && budgetStreams.length === 0) return null

  const shown = showAll ? citingEntities : citingEntities.slice(0, VISIBLE)

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Building className="h-4 w-4" />
            {citingEntities.length}{' '}
            {citingEntities.length === 1 ? 'Entity' : 'Entities'} Citing this
            Document
          </h3>

          {budgetStreams.length > 0 && (
            <button
              onClick={() => setGroupByBudget(!groupByBudget)}
              aria-pressed={groupByBudget}
              className="inline-flex items-center gap-1.5 text-xs text-un-blue hover:text-un-blue/80"
            >
              <Network className="h-3.5 w-3.5" />
              {groupByBudget ? 'Show as list' : 'Group by budget location'}
            </button>
          )}
        </div>

        {groupByBudget ? (
          <BudgetLocationTree
            streams={budgetStreams}
            foundationalEntities={foundationalEntities}
          />
        ) : (
          <div className="space-y-1.5 text-xs">
            {shown.map((entity) => (
              <div key={entity} className="flex items-center gap-2">
                <EntityBadge
                  entity={entity}
                  entityLong={entityLongNames.get(entity)}
                  foundational={isFoundational(entity, foundationalEntities)}
                  onClick={() => {
                    window.location.href = `/?entity=${encodeURIComponent(entity)}`
                  }}
                />
                <span
                  className="min-w-0 flex-1 truncate text-muted-foreground"
                  title={entityLongNames.get(entity)}
                >
                  {entityLongNames.get(entity) ?? entity}
                </span>
                {isFoundational(entity, foundationalEntities) && (
                  <FoundationalTag />
                )}
              </div>
            ))}

            {citingEntities.length > VISIBLE && (
              <div className="mt-2 w-full">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="inline-block text-left text-sm text-un-blue hover:text-un-blue/80"
                >
                  {showAll
                    ? 'Show less'
                    : `Show ${citingEntities.length - VISIBLE} more`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
