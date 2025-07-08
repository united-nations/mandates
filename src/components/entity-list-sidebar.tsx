'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Building } from 'lucide-react'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { SearchInput } from '@/components/ui/search-input'
import { SidebarListItem } from '@/components/ui/sidebar-list-item'
import { EntityName } from '@/components/ui/entity-name'
import { useFilters } from '@/contexts/FilterContext'
import type { EntityWithCount, Entity } from '@/types'

interface EntityListSidebarProps {
  entities: EntityWithCount[]
  allEntities: Entity[]
  isLoading?: boolean
  hideHeader?: boolean
  borderless?: boolean
  pageType: 'main' | 'entity' | 'organ'
  organFilter?: string
}

export function EntityListSidebar({ 
  entities, 
  allEntities, 
  isLoading = false, 
  hideHeader = false, 
  borderless = false,
  pageType,
  organFilter
}: EntityListSidebarProps) {
  const { filters, setFilter } = useFilters();
  
  const [filteredEntities, setFilteredEntities] = useState<EntityWithCount[]>(entities)
  const [searchTerm, setSearchTerm] = useState('')
  const maxCount = Math.max(...entities.map(entity => entity.count), 1)

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEntities(entities)
    } else {
      const lowerSearch = searchTerm.toLowerCase()
      const filtered = entities.filter(entity => {
        const shortName = entity.entity.toLowerCase()
        const longName = (allEntities.find(e => e.entity === entity.entity)?.entity_long || '').toLowerCase()
        return shortName.includes(lowerSearch) || longName.includes(lowerSearch)
      })
      setFilteredEntities(filtered)
    }
  }, [searchTerm, entities, allEntities])

  const handleEntityClick = (entityName: string) => {
    if (pageType === 'main') {
      // On main page: Navigate to entity page (simple link - will be handled by Link component)
      return;
    } else {
      // On entity/organ pages: Set as filter
      setFilter('entity', entityName);
    }
  };

  const LoadingSkeletonComponent = () => (
    <LoadingSkeleton variant="sidebar" count={8} />
  )

  return (
    <div className={borderless ? '' : 'border-l-2 border-gray-200 pl-4'}>
      {!hideHeader && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Building className="h-5 w-5 text-un-blue" />
            <h3 className="text-lg font-semibold">UN Entities</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {pageType === 'organ' 
              ? `Entities and number of cited source documents for ${organFilter}`
              : pageType === 'entity'
              ? 'Click to add entity filter'
              : 'Entities and number of cited source documents'
            }
          </p>
        </div>
      )}
      
      <div className="space-y-3">
        <SearchInput
          placeholder="Search entities..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          variant="border-bottom"
        />
        
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <LoadingSkeletonComponent />
          ) : (
            <div className="space-y-1">
              {filteredEntities.map((entity) => (
                pageType === 'main' ? (
                  <Link 
                    key={entity.entity} 
                    href={`/entity/${encodeURIComponent(entity.entity)}`}
                    className="block"
                  >
                    <SidebarListItem
                      label={
                        <EntityName 
                          entityName={entity.entity} 
                          entityLong={allEntities.find(e => e.entity === entity.entity)?.entity_long}
                          asChild={true} 
                        />
                      }
                      count={entity.count}
                      maxCount={maxCount}
                      isActive={filters.entity === entity.entity}
                      onClick={() => {}} // Empty onClick for Link wrapper
                    />
                  </Link>
                ) : (
                  <SidebarListItem
                    key={entity.entity}
                    label={
                      <EntityName 
                        entityName={entity.entity} 
                        entityLong={allEntities.find(e => e.entity === entity.entity)?.entity_long}
                        asChild={true} 
                      />
                    }
                    count={entity.count}
                    maxCount={maxCount}
                    isActive={filters.entity === entity.entity}
                    onClick={() => handleEntityClick(entity.entity)}
                  />
                )
              ))}
              {filteredEntities.length === 0 && !isLoading && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No entities found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 