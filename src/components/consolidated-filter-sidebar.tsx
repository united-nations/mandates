'use client'

import { useState, useEffect } from 'react'
import { Link as LinkIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EntityName } from '@/components/ui/entity-name'
import { useFilters } from '@/contexts/FilterContext'

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

export function ConsolidatedFilterSidebar() {
  const { 
    filters, 
    setFilter, 
    isEntityPage, 
    isOrganPage, 
    currentEntityName, 
    currentOrganName 
  } = useFilters();

  const [entityCrossCitations, setEntityCrossCitations] = useState<CrossCitationEntity[]>([])
  const [organCrossCitations, setOrganCrossCitations] = useState<CrossCitationOrgan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const DISPLAY_LIMIT = 30

  useEffect(() => {
    async function fetchCrossCitations() {
      setIsLoading(true)
      try {
        if (isEntityPage && currentEntityName) {
          // Build URL with current filters (excluding entity and cross_entity filters)
          const queryParams = new URLSearchParams();
          Object.entries(filters).forEach(([key, value]) => {
            if (value && key !== 'entity' && key !== 'cross_entity') {
              queryParams.set(key, value);
            }
          });
          const queryString = queryParams.toString();
          const url = `/api/entities/${encodeURIComponent(currentEntityName)}/cross-citations${queryString ? `?${queryString}` : ''}`;
          
          const res = await fetch(url)
          if (res.ok) {
            const data = await res.json()
            // Filter out null, undefined, or empty string entities
            const filteredData = data.filter((citation: CrossCitationEntity) => 
              citation.entity && 
              citation.entity.trim() !== '' && 
              citation.entity !== 'null' &&
              citation.entity !== 'undefined'
            );
            setEntityCrossCitations(filteredData)
          }
        } else {
          setEntityCrossCitations([])
        }
        if (isOrganPage && currentOrganName) {
          // Build URL with current filters (excluding organ filter)
          const queryParams = new URLSearchParams();
          Object.entries(filters).forEach(([key, value]) => {
            if (value && key !== 'organ') {
              queryParams.set(key, value);
            }
          });
          const queryString = queryParams.toString();
          const url = `/api/organs/${encodeURIComponent(currentOrganName)}/cross-citations${queryString ? `?${queryString}` : ''}`;
          
          const res = await fetch(url)
          if (res.ok) {
            const data = await res.json()
            // Filter out null, undefined, or empty string organs
            const filteredData = data.filter((citation: CrossCitationOrgan) => 
              citation.organ && 
              citation.organ.trim() !== '' && 
              citation.organ !== 'null' &&
              citation.organ !== 'undefined'
            );
            setOrganCrossCitations(filteredData)
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
  }, [isEntityPage, isOrganPage, currentEntityName, currentOrganName, filters])

  const handleEntityClick = (entityName: string) => {
    setFilter('cross_entity', entityName);
  };

  const handleOrganClick = (organName: string) => {
    setFilter('organ', organName);
  };

  // Filter and truncate logic
  const filteredEntities = entityCrossCitations;
  const filteredOrgans = organCrossCitations;
  const showEntitySection = isEntityPage && currentEntityName && filteredEntities.length > 0
  const showOrganSection = isOrganPage && currentOrganName && filteredOrgans.length > 0

  // Find max for bar scaling
  const maxEntityCount = filteredEntities.length > 0 ? Math.max(...filteredEntities.map(e => e.sharedMandatesCount)) : 1;
  const maxOrganCount = filteredOrgans.length > 0 ? Math.max(...filteredOrgans.map(o => o.sharedMandatesCount)) : 1;

  return (
    <div className="w-full lg:w-80 flex-shrink-0 border-l-2 border-gray-200 pl-4">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <LinkIcon className="h-5 w-5 text-un-blue" />
          <h3 className="text-lg font-semibold">Cross-citations</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {isEntityPage && currentEntityName 
            ? `Entities that share mandate citations with ${currentEntityName}`
            : isOrganPage && currentOrganName
            ? `Organs that share mandates with ${currentOrganName}`
            : "Entities/organs that share mandates with this selection"
          }
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
                        className={`group w-full flex items-center gap-2 px-2 py-1 rounded transition-colors ${
                          filters.cross_entity === citation.entity ? 'bg-un-blue/10 text-un-blue font-bold' : 'hover:bg-muted/40'
                        }`}
                        onClick={() => handleEntityClick(citation.entity)}
                      >
                        <span className="flex-1 truncate text-left text-sm">
                          <EntityName entityName={citation.entity} showUnderline={false} asChild={true} />
                        </span>
                        <span className="flex items-center w-full max-w-[100px]">
                          <span className="text-xs font-mono text-un-blue text-right pr-2 min-w-[28px] max-w-[32px] flex-shrink-0 justify-end flex">{citation.sharedMandatesCount}</span>
                          <span className="relative flex-1 h-2 bg-un-blue/10 rounded">
                            <span className="absolute left-0 top-0 h-2 rounded bg-un-blue/60" style={{ width: `${(citation.sharedMandatesCount / maxEntityCount) * 100}%`, minWidth: 2 }} />
                          </span>
                        </span>
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
                        className={`group w-full flex items-center gap-2 px-2 py-1 rounded transition-colors ${
                          filters.organ === citation.organ ? 'bg-un-blue/10 text-un-blue font-bold' : 'hover:bg-muted/40'
                        }`}
                        onClick={() => handleOrganClick(citation.organ)}
                      >
                        <span className="flex-1 truncate text-left text-sm">{citation.organ}</span>
                        <span className="flex items-center w-full max-w-[100px]">
                          <span className="text-xs font-mono text-un-blue text-right pr-2 min-w-[28px] max-w-[32px] flex-shrink-0 justify-end flex">{citation.sharedMandatesCount}</span>
                          <span className="relative flex-1 h-2 bg-un-blue/10 rounded">
                            <span className="absolute left-0 top-0 h-2 rounded bg-un-blue/60" style={{ width: `${(citation.sharedMandatesCount / maxOrganCount) * 100}%`, minWidth: 2 }} />
                          </span>
                        </span>
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