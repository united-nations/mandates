'use client'

import { useState, useEffect } from 'react'
import { Filter, ArrowRight } from 'lucide-react'

interface EntityWithCount {
  name: string
  count: number
}

interface BodyWithCount {
  name: string
  count: number
}

interface Organ {
  short: string
  long: string
}

interface ConsolidatedFilterSidebarProps {
  onEntityClick: (entityName: string) => void
  onOrganClick: (organName: string) => void
  selectedEntity?: string
  selectedOrgan?: string
}

export function ConsolidatedFilterSidebar({ 
  onEntityClick, 
  onOrganClick, 
  selectedEntity, 
  selectedOrgan 
}: ConsolidatedFilterSidebarProps) {
  const [entities, setEntities] = useState<EntityWithCount[]>([])
  const [organs, setOrgans] = useState<BodyWithCount[]>([])
  const [allOrgans, setAllOrgans] = useState<Organ[]>([])
  const [entityMaxCount, setEntityMaxCount] = useState(1)
  const [organMaxCount, setOrganMaxCount] = useState(1)

  useEffect(() => {
    async function fetchData() {
      try {
        const [metaResponse, organsResponse] = await Promise.all([
          fetch('/api/mandates/meta'),
          fetch('/api/organs')
        ])
        
        if (metaResponse.ok) {
          const metaData = await metaResponse.json()
          
          // Handle entities
          const entitiesData = (metaData.uniqueEntities || []).sort((a: EntityWithCount, b: EntityWithCount) => b.count - a.count)
          setEntities(entitiesData)
          setEntityMaxCount(Math.max(...entitiesData.map((e: EntityWithCount) => e.count), 1))
          
          // Handle organs
          const organsData = (metaData.uniqueBodiesWithCount || []).sort((a: BodyWithCount, b: BodyWithCount) => b.count - a.count)
          setOrgans(organsData)
          setOrganMaxCount(Math.max(...organsData.map((o: BodyWithCount) => o.count), 1))
        }
        
        if (organsResponse.ok) {
          const organsData = await organsResponse.json()
          setAllOrgans(organsData)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      }
    }
    fetchData()
  }, [])

  const getOrganDisplayName = (organName: string): string => {
    const organData = allOrgans.find(organ => organ.short === organName || organ.long === organName)
    if (organName === "General Assembly" || organName === "Security Council") {
      return organName
    }
    return organData ? `${organData.short} – ${organData.long}` : organName
  }

  return (
    <div className="w-full lg:w-72 flex-shrink-0">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 text-un-blue font-semibold text-base">
          <Filter className="h-4 w-4" />
          Cross-citations
        </div>
        
        {/* Entity Filters */}
        <div className="mb-6">
          <div className="text-sm font-medium text-muted-foreground mb-2">Filter by Entity</div>
          <div className="space-y-1">
            {entities
              .filter(entity => entity.name !== selectedEntity)
              .slice(0, 15)
              .map(entity => (
              <button
                key={entity.name}
                className={`group w-full flex items-center gap-2 px-2 py-1 rounded transition-colors ${selectedEntity === entity.name ? 'bg-un-blue/10 text-un-blue font-bold' : 'hover:bg-muted/40'}`}
                onClick={() => onEntityClick(entity.name)}
              >
                <span className="flex-1 truncate text-left text-sm">{entity.name}</span>
                <span className="relative flex items-center min-w-[60px]">
                  <span className="text-xs font-mono text-un-blue z-10 pr-2">{entity.count}</span>
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-2 rounded bg-un-blue/20" style={{ width: `${Math.max(10, (entity.count / entityMaxCount) * 50)}%`, minWidth: 10 }} />
                </span>
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-un-blue" />
              </button>
            ))}
          </div>
        </div>

        {/* Organ Filters */}
        <div className="mb-6">
          <div className="text-sm font-medium text-muted-foreground mb-2">Filter by Organ</div>
          <div className="space-y-1">
            {organs
              .filter(organ => organ.name !== selectedOrgan)
              .slice(0, 15)
              .map(organ => (
              <button
                key={organ.name}
                className={`group w-full flex items-center gap-2 px-2 py-1 rounded transition-colors ${selectedOrgan === organ.name ? 'bg-un-blue/10 text-un-blue font-bold' : 'hover:bg-muted/40'}`}
                onClick={() => onOrganClick(organ.name)}
              >
                <span className="flex-1 truncate text-left text-sm">{getOrganDisplayName(organ.name)}</span>
                <span className="relative flex items-center min-w-[60px]">
                  <span className="text-xs font-mono text-un-blue z-10 pr-2">{organ.count}</span>
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-2 rounded bg-un-blue/20" style={{ width: `${Math.max(10, (organ.count / organMaxCount) * 50)}%`, minWidth: 10 }} />
                </span>
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-un-blue" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 