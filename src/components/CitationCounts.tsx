'use client'

import { useState, useMemo } from 'react'
import { Building, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { titleCase } from 'title-case'
import type { Mandate, Entity } from '@/types'

interface CitationCountsProps {
  mandate: Mandate
  entities: Entity[]
}

export function CitationCounts({ mandate, entities }: CitationCountsProps) {
  const [showAllEntities, setShowAllEntities] = useState(false)
  const [showAllProgrammes, setShowAllProgrammes] = useState(false)

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

  const programmeCounts = useMemo(() => {
    if (!mandate || !mandate.citation_info) return []

    const counts: { [key: string]: number } = {}

    mandate.citation_info.forEach((citation) => {
      const programmeTitle = citation.programme_title
      if (programmeTitle) {
        if (!counts[programmeTitle]) {
          counts[programmeTitle] = 0
        }
        counts[programmeTitle]++
      }
    })

    return Object.entries(counts).sort(([titleA, countA], [titleB, countB]) => {
      if (countB !== countA) {
        return countB - countA
      }
      return titleA.localeCompare(titleB)
    })
  }, [mandate])

  if (entityCounts.length === 0 && programmeCounts.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
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
                          // Navigate to entity detail page
                          window.location.href = `/entity/${encodeURIComponent(shortName)}`
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

      {/* Programme Counts */}
      {programmeCounts.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Target className="h-4 w-4" />
            {programmeCounts.length}{' '}
            {programmeCounts.length === 1 ? 'Programme' : 'Programmes'} Citing
            this Document
          </h3>
          <div className="space-y-1.5 text-xs">
            {(showAllProgrammes
              ? programmeCounts
              : programmeCounts.slice(0, 5)
            ).map(([programmeTitle, count]) => (
              <div key={programmeTitle} className="flex items-center gap-2">
                <span className="shrink-0 font-mono text-muted-foreground">
                  {count}x
                </span>
                <div className="min-w-0 flex-1">
                  <Badge
                    variant="secondary"
                    className="cursor-pointer border-0 px-2.5 py-0.5 text-xs transition-colors hover:bg-secondary/80"
                    onClick={() => {
                      // Navigate to filtered results with only the programme filter
                      const url = new URL(window.location.origin + '/')
                      url.searchParams.set('page', '1')
                      url.searchParams.set('programme', programmeTitle)
                      window.location.href = url.toString()
                    }}
                  >
                    {titleCase(programmeTitle)}
                  </Badge>
                </div>
              </div>
            ))}
            {programmeCounts.length > 5 && (
              <div className="mt-2 w-full">
                <button
                  onClick={() => setShowAllProgrammes(!showAllProgrammes)}
                  className="inline-block text-left text-sm text-un-blue hover:text-un-blue/80"
                >
                  {showAllProgrammes
                    ? 'Show less'
                    : `Show ${programmeCounts.length - 5} more`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
