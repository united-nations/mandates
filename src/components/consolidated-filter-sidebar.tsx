'use client'

import { useState, useEffect } from 'react'
import { Filter, ArrowRight, Building, Landmark, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EntityName } from '@/components/ui/entity-name'

interface CrossCitationEntity {
  entity: string
  sharedMandatesCount: number
  totalMandatesCount: number
}

interface CrossCitationOrgan {
  organ: string
  sharedMandatesCount: number
  totalMandatesCount: number
}

interface ConsolidatedFilterSidebarProps {
  onEntityClick: (entityName: string) => void
  onOrganClick: (organName: string) => void
  selectedEntity?: string
  selectedOrgan?: string
  currentEntity?: string
  currentOrgan?: string
}

export function ConsolidatedFilterSidebar({ 
  onEntityClick, 
  onOrganClick, 
  selectedEntity, 
  selectedOrgan,
  currentEntity,
  currentOrgan
}: ConsolidatedFilterSidebarProps) {
  const [entityCrossCitations, setEntityCrossCitations] = useState<CrossCitationEntity[]>([])
  const [organCrossCitations, setOrganCrossCitations] = useState<CrossCitationOrgan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const DISPLAY_LIMIT = 30

  useEffect(() => {
    async function fetchCrossCitations() {
      setIsLoading(true)
      try {
        if (currentEntity) {
          const res = await fetch(`/api/entities/${encodeURIComponent(currentEntity)}/cross-citations`)
          if (res.ok) {
            setEntityCrossCitations(await res.json())
          }
        } else {
          setEntityCrossCitations([])
        }
        if (currentOrgan) {
          const res = await fetch(`/api/organs/${encodeURIComponent(currentOrgan)}/cross-citations`)
          if (res.ok) {
            setOrganCrossCitations(await res.json())
          }
        } else {
          setOrganCrossCitations([])
        }
      } catch (e) {
        setEntityCrossCitations([])
        setOrganCrossCitations([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchCrossCitations()
  }, [currentEntity, currentOrgan])

  // Filter and truncate logic
  const filteredEntities = entityCrossCitations;
  const filteredOrgans = organCrossCitations;
  const showEntitySection = currentEntity && filteredEntities.length > 0
  const showOrganSection = currentOrgan && filteredOrgans.length > 0

  // Find max for bar scaling
  const maxEntityCount = filteredEntities.length > 0 ? Math.max(...filteredEntities.map(e => e.sharedMandatesCount)) : 1;
  const maxOrganCount = filteredOrgans.length > 0 ? Math.max(...filteredOrgans.map(o => o.sharedMandatesCount)) : 1;

  return (
    <div className="w-full lg:w-80 flex-shrink-0 border-l-2 border-un-blue/20 pl-4">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 text-un-blue font-semibold text-base">
          <Filter className="h-4 w-4" />
          Cross-citations
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Entities/organs that share mandates with this selection
        </p>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : (
            <>
              {showEntitySection && (
                <div className="mb-6">
                  <div className="space-y-1">
                    {(showAll ? filteredEntities : filteredEntities.slice(0, DISPLAY_LIMIT)).map(citation => (
                      <button
                        key={citation.entity}
                        className={`group w-full flex items-center gap-2 px-2 py-1 rounded transition-colors ${selectedEntity === citation.entity ? 'bg-un-blue/10 text-un-blue font-bold' : 'hover:bg-muted/40'}`}
                        onClick={() => onEntityClick(citation.entity)}
                      >
                        <span className="flex-1 truncate text-left text-sm">
                          <EntityName entityName={citation.entity} showUnderline={false} />
                        </span>
                        <span className="flex items-center min-w-[70px]">
                          <span className="block h-1 rounded bg-un-blue/20" style={{ width: `${Math.max(10, (citation.sharedMandatesCount / maxEntityCount) * 40)}px`, minWidth: 10, marginRight: 8 }} />
                          <span className="text-xs font-mono text-un-blue" style={{ minWidth: 18, textAlign: 'right' }}>{citation.sharedMandatesCount}</span>
                        </span>
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-un-blue" />
                      </button>
                    ))}
                  </div>
                  {filteredEntities.length > DISPLAY_LIMIT && (
                    <div className="text-xs text-muted-foreground text-center pt-2 border-t border-muted/30">
                      <button className="underline" onClick={() => setShowAll(v => !v)}>
                        {showAll ? `Show less` : `Show all ${filteredEntities.length} entities`}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {showOrganSection && (
                <div className="mb-6">
                  <div className="space-y-1">
                    {(showAll ? filteredOrgans : filteredOrgans.slice(0, DISPLAY_LIMIT)).map(citation => (
                      <button
                        key={citation.organ}
                        className={`group w-full flex items-center gap-2 px-2 py-1 rounded transition-colors ${selectedOrgan === citation.organ ? 'bg-un-blue/10 text-un-blue font-bold' : 'hover:bg-muted/40'}`}
                        onClick={() => onOrganClick(citation.organ)}
                      >
                        <span className="flex-1 truncate text-left text-sm">{citation.organ}</span>
                        <span className="flex items-center min-w-[70px]">
                          <span className="block h-1 rounded bg-un-blue/20" style={{ width: `${Math.max(10, (citation.sharedMandatesCount / maxOrganCount) * 40)}px`, minWidth: 10, marginRight: 8 }} />
                          <span className="text-xs font-mono text-un-blue" style={{ minWidth: 18, textAlign: 'right' }}>{citation.sharedMandatesCount}</span>
                        </span>
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-un-blue" />
                      </button>
                    ))}
                  </div>
                  {filteredOrgans.length > DISPLAY_LIMIT && (
                    <div className="text-xs text-muted-foreground text-center pt-2 border-t border-muted/30">
                      <button className="underline" onClick={() => setShowAll(v => !v)}>
                        {showAll ? `Show less` : `Show all ${filteredOrgans.length} organs`}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!showEntitySection && !showOrganSection && (
                <div className="text-xs text-muted-foreground">No cross-citations found for the current selection.</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}