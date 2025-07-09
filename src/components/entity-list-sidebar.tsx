'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Building } from 'lucide-react'
import { EntityName } from '@/components/ui/entity-name'
import { useFilters } from '@/contexts/FilterContext'
import { GenericSidebar } from '@/components/ui/generic-sidebar'
import { SidebarListItem } from '@/components/ui/sidebar-list-item'
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
  
  const maxCount = Math.max(...entities.map(entity => entity.count), 1)

  const handleEntityClick = (entityName: string) => {
    if (pageType === 'main') {
      // On main page: Navigate to entity page (simple link - will be handled by Link component)
      return;
    } else {
      // On entity/organ pages: Set as filter
      setFilter('entity', entityName);
    }
  };

  // Get description based on page type
  const getDescription = () => {
    if (pageType === 'organ') {
      return `Entities and number of cited source documents for ${organFilter}`
    } else {
      return 'Entities and number of cited source documents'
    }
  }

  // Get variant based on page type
  const variant = pageType === 'main' ? 'navigation' : 'filter'

  // Search filter function
  const searchFilter = (entity: EntityWithCount, searchTerm: string) => {
    const shortName = entity.entity.toLowerCase()
    const longName = (allEntities.find(e => e.entity === entity.entity)?.entity_long || '').toLowerCase()
    return shortName.includes(searchTerm) || longName.includes(searchTerm)
  }

  // Render item function
  const renderItem = (entity: EntityWithCount, index: number, variant: 'navigation' | 'filter') => {
    const item = (
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
        variant={variant}
      />
    )

    // For main page, wrap in Link
    if (pageType === 'main') {
      return (
        <Link 
          key={entity.entity} 
          href={`/entity/${encodeURIComponent(entity.entity)}`}
          className="block"
          prefetch={false}
        >
          {item}
        </Link>
      )
    }

    return item
  }

  return (
    <GenericSidebar
      icon={Building}
      title="UN Entities"
      description={getDescription()}
      items={entities}
      isLoading={isLoading}
      searchPlaceholder="Search entities..."
      searchFilter={searchFilter}
      renderItem={renderItem}
      hideHeader={hideHeader}
      borderless={borderless}
      variant={variant}
      emptyMessage="No entities found"
    />
  )
} 