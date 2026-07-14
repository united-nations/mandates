'use client'

import { useState, useMemo } from 'react'
import { Building, Network } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Mandate, Entity } from '@/types'
import { BudgetLocationList } from '@/components/BudgetLocationList'

interface CitationCountsProps {
  mandate: Mandate
  entities: Entity[]
}

export function CitationCounts({ mandate, entities }: CitationCountsProps) {
  const [showAllEntities, setShowAllEntities] = useState(false)

  // Build entity map from entities data
  const entityMap = useMemo(() => {
    const map = new Map()
    entities.forEach((entity) => {
      map.set(entity.entity, entity)
    })
    return map
  }, [entities])

  // Create entity lookup function using the API-provided entity map
  const getEntityLongName = (shortName: string): string => {
    const entity = entityMap.get(shortName)
    return entity?.entity_long || shortName
  }

  const entityCounts = useMemo(() => {
    if (!mandate || !mandate.citation_info) return []

    const counts: { [key: string]: { longName: string; count: number } } = {}

    mandate.citation_info.forEach((citation) => {
      const shortName = citation.entity
      if (shortName) {
        if (!counts[shortName]) {
          // Use lookup function instead of citation data
          counts[shortName] = {
            longName: getEntityLongName(shortName),
            count: 0,
          }
        }
        counts[shortName].count++
      }
    })

    return Object.entries(counts).sort(
      ([shortNameA, dataA], [shortNameB, dataB]) => {
        if (dataB.count !== dataA.count) {
          return dataB.count - dataA.count
        }
        return shortNameA.localeCompare(shortNameB)
      }
    )
  }, [mandate, getEntityLongName])

  const budgetLocations = mandate.budget_locations ?? []

  if (entityCounts.length === 0 && budgetLocations.length === 0) {
    return null
  }

  return (
    <div className="@container grid grid-cols-1 gap-6 @min-[700px]:grid-cols-2 @min-[700px]:gap-8">
      {/* Entities Mentioned */}
      {entityCounts.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Building className="h-4 w-4" />
            {entityCounts.length}{' '}
            {entityCounts.length === 1 ? 'Entity' : 'Entities'} Citing this
            Document
          </h3>
          <div className="space-y-1.5 text-xs">
            {(showAllEntities ? entityCounts : entityCounts.slice(0, 5)).map(
              ([shortName, data]) => (
                <div key={shortName} className="flex items-center gap-2">
                  <span className="shrink-0 font-mono text-muted-foreground">
                    {data.count}x
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="shrink-0 cursor-pointer border-0 bg-un-blue! px-2.5 py-0.5 text-xs text-white! transition-colors hover:bg-un-blue/90!"
                        onClick={() => {
                          window.location.href = `/?entity=${encodeURIComponent(shortName)}`
                        }}
                      >
                        {shortName}
                      </Badge>
                      <span
                        className="truncate text-xs text-muted-foreground"
                        title={data.longName}
                      >
                        {data.longName}
                      </span>
                    </div>
                  </div>
                </div>
              )
            )}
            {entityCounts.length > 5 && (
              <div className="mt-2 w-full">
                <button
                  onClick={() => setShowAllEntities(!showAllEntities)}
                  className="inline-block text-left text-sm text-un-blue hover:text-un-blue/80"
                >
                  {showAllEntities
                    ? 'Show less'
                    : `Show ${entityCounts.length - 5} more`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Where in the budget those citations sit. This used to be a second
          list, "N Programmes Citing this Document" — but a programme is a
          strict function of the citing entity (no entity spans more than one
          section, and every section has exactly one programme), so it was the
          entity list restated. The budget path is the information that list was
          missing. */}
      {budgetLocations.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Network className="h-4 w-4" />
            Cited in the Budget
          </h3>
          <BudgetLocationList locations={budgetLocations} />
        </div>
      )}
    </div>
  )
}
