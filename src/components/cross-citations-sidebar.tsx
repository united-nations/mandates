'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Link as LinkIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EntityName } from '@/components/ui/entity-name'
import { useFilters } from '@/contexts/FilterContext'
import type { CrossCitation, Entity } from '@/types'

interface CrossCitationOrgan {
  organ: string
  sharedMandatesCount: number
  totalMandatesCount: number
}

interface CrossCitationsSidebarProps {
  crossCitations: CrossCitation[]
  allEntities: Entity[]
  isLoading?: boolean
  pageType: 'main' | 'entity' | 'organ'
  entityFilter?: string
  organFilter?: string
}

export function CrossCitationsSidebar({ 
  crossCitations, 
  allEntities, 
  isLoading = false,
  pageType,
  entityFilter,
  organFilter
}: CrossCitationsSidebarProps) {
  const { filters, setFilter } = useFilters();

  const [showAll, setShowAll] = useState(false)
  const DISPLAY_LIMIT = 30

  const handleEntityClick = (entityName: string) => {
    // On entity/organ pages: Set as filter (cross-citations sidebar only appears on these pages)
    setFilter('entity', entityName);
  };

  const handleOrganClick = (organName: string) => {
    // On entity/organ pages: Set as filter (cross-citations sidebar only appears on these pages)
    setFilter('organ', organName);
  };

  // Filter and truncate logic
  const filteredCitations = crossCitations;
  const showEntitySection = pageType === 'entity' && entityFilter && filteredCitations.length > 0
  const showOrganSection = pageType === 'organ' && organFilter && filteredCitations.length > 0

  // Find max for bar scaling
  const maxEntityCount = filteredCitations.length > 0 ? Math.max(...filteredCitations.map(c => c.count)) : 1;

  if (!showEntitySection && !showOrganSection) {
    return null;
  }

  return (
    <div className="border-l-2 border-gray-200 pl-4">
      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      )}
      
      {!isLoading && showEntitySection && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <LinkIcon className="h-5 w-5 text-un-blue" />
            <h3 className="text-lg font-semibold">Cross-Citations</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Click to add entity filter - Other entities and the number of source documents they cite that {entityFilter} also cites
          </p>
          
          <div className="space-y-1">
            {filteredCitations.slice(0, showAll ? filteredCitations.length : DISPLAY_LIMIT).map((citation) => (
              <div
                key={citation.entity}
                                 className={`flex items-center justify-between p-2 rounded-sm hover:bg-muted/30 cursor-pointer group border-b border-muted/30 last:border-b-0 ${
                   filters.entity === citation.entity ? 'bg-un-blue/10 border-un-blue/30' : ''
                 }`}
                onClick={() => handleEntityClick(citation.entity)}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    <EntityName 
                      entityName={citation.entity} 
                      entityLong={allEntities.find(e => e.entity === citation.entity)?.entity_long}
                      asChild={true} 
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 w-32">
                  <span className="flex items-center w-full">
                    <span className="text-xs font-mono text-un-blue text-right pr-2 min-w-[28px] max-w-[32px] flex-shrink-0 justify-end flex">{citation.count.toLocaleString()}</span>
                    <span className="relative flex-1 h-2 bg-un-blue/10 rounded">
                      <span className="absolute left-0 top-0 h-2 rounded bg-un-blue/60" style={{ width: `${(citation.count / maxEntityCount) * 100}%`, minWidth: 2 }} />
                    </span>
                  </span>
                </div>
              </div>
            ))}
            
            {filteredCitations.length > DISPLAY_LIMIT && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-sm text-un-blue hover:text-un-blue/80 mt-2 w-full text-left"
              >
                {showAll ? 'Show less' : `Show ${filteredCitations.length - DISPLAY_LIMIT} more`}
              </button>
            )}
          </div>
        </div>
      )}

      {!isLoading && showOrganSection && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <LinkIcon className="h-5 w-5 text-un-blue" />
            <h3 className="text-lg font-semibold">Related Organs</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Click to add organ filter - Other organs citing the same entities as {organFilter}
          </p>
          
          <div className="space-y-1">
            {filteredCitations.slice(0, showAll ? filteredCitations.length : DISPLAY_LIMIT).map((citation) => (
              <div
                key={citation.entity}
                className={`flex items-center justify-between p-2 rounded-sm hover:bg-muted/30 cursor-pointer group border-b border-muted/30 last:border-b-0 ${
                  filters.organ === citation.entity ? 'bg-un-blue/10 border-un-blue/30' : ''
                }`}
                onClick={() => handleOrganClick(citation.entity)}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {citation.entity_long || citation.entity}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 w-32">
                  <span className="flex items-center w-full">
                    <span className="text-xs font-mono text-un-blue text-right pr-2 min-w-[28px] max-w-[32px] flex-shrink-0 justify-end flex">{citation.count.toLocaleString()}</span>
                    <span className="relative flex-1 h-2 bg-un-blue/10 rounded">
                      <span className="absolute left-0 top-0 h-2 rounded bg-un-blue/60" style={{ width: `${(citation.count / maxEntityCount) * 100}%`, minWidth: 2 }} />
                    </span>
                  </span>
                </div>
              </div>
            ))}
            
            {filteredCitations.length > DISPLAY_LIMIT && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-sm text-un-blue hover:text-un-blue/80 mt-2 w-full text-left"
              >
                {showAll ? 'Show less' : `Show ${filteredCitations.length - DISPLAY_LIMIT} more`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 