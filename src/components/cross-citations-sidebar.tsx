'use client'

import Link from 'next/link'
import { Link as LinkIcon } from 'lucide-react'
import { EntityName } from '@/components/ui/entity-name'
import { useFilters } from '@/contexts/FilterContext'
import { GenericSidebar } from '@/components/ui/generic-sidebar'
import { SidebarListItem } from '@/components/ui/sidebar-list-item'
import type { CrossCitation, Entity } from '@/types'

interface CrossCitationsSidebarProps {
  crossCitations: CrossCitation[]
  allEntities: Entity[]
  isLoading?: boolean
  pageType: 'main' | 'entity' | 'organ'
  entityFilter?: string
  organFilter?: string
  hideHeader?: boolean
  borderless?: boolean
}

export function CrossCitationsSidebar({ 
  crossCitations, 
  allEntities, 
  isLoading = false,
  pageType,
  entityFilter,
  organFilter,
  hideHeader = false,
  borderless = false
}: CrossCitationsSidebarProps) {
  const { filters, setFilter } = useFilters();

  const handleEntityClick = (entityName: string) => {
    // On entity/organ pages: Set as crossCitingEntity filter to show intersection
    setFilter('crossCitingEntity', entityName);
  };

  const handleOrganClick = (organName: string) => {
    // On entity/organ pages: Set as filter (cross-citations sidebar only appears on these pages)
    setFilter('organ', organName);
  };

  // Filter logic
  const showEntitySection = pageType === 'entity' && entityFilter
  const showOrganSection = pageType === 'organ' && organFilter

  // Find max for bar scaling
  const maxEntityCount = crossCitations.length > 0 ? Math.max(...crossCitations.map(c => c.count)) : 1;

  // Search filter function
  const searchFilter = (citation: CrossCitation, searchTerm: string) => {
    const shortName = citation.entity.toLowerCase()
    const longName = (citation.entity_long || '').toLowerCase()
    const entityLong = allEntities.find(e => e.entity === citation.entity)?.entity_long?.toLowerCase() || ''
    
    return shortName.includes(searchTerm) || 
           longName.includes(searchTerm) || 
           entityLong.includes(searchTerm)
  }

  // Render item function for entities
  const renderEntityItem = (citation: CrossCitation, index: number, variant: 'navigation' | 'filter') => (
    <SidebarListItem
      key={citation.entity}
      label={
        <EntityName 
          entityName={citation.entity} 
          entityLong={allEntities.find(e => e.entity === citation.entity)?.entity_long}
          asChild={true} 
        />
      }
      count={citation.count}
      maxCount={maxEntityCount}
      isActive={filters.crossCitingEntity === citation.entity}
      onClick={() => handleEntityClick(citation.entity)}
      variant={variant}
    />
  )

  // Render item function for organs
  const renderOrganItem = (citation: CrossCitation, index: number, variant: 'navigation' | 'filter') => (
    <SidebarListItem
      key={citation.entity}
      label={citation.entity_long || citation.entity}
      count={citation.count}
      maxCount={maxEntityCount}
      isActive={filters.organ === citation.entity}
      onClick={() => handleOrganClick(citation.entity)}
      variant={variant}
    />
  )

  if (!showEntitySection && !showOrganSection) {
    return null;
  }

  return (
    <>
      {showEntitySection && (
        <GenericSidebar
          icon={LinkIcon}
          title="Cross-Citations"
          description={`Other entities and the number of source documents cited by both ${entityFilter} and the other entities`}
          items={crossCitations}
          isLoading={isLoading}
          searchPlaceholder="Search entities..."
          searchFilter={searchFilter}
          renderItem={renderEntityItem}
          showExpandCollapse={true}
          maxItemsBeforeExpand={30}
          variant="filter"
          emptyMessage="No cross-citations found"
          hideHeader={hideHeader}
          borderless={borderless}
        />
      )}
      
      {showOrganSection && (
        <GenericSidebar
          icon={LinkIcon}
          title="Related Organs"
          description={`Click to add organ filter - Other organs citing the same entities as ${organFilter}`}
          items={crossCitations}
          isLoading={isLoading}
          searchPlaceholder="Search organs..."
          searchFilter={searchFilter}
          renderItem={renderOrganItem}
          showExpandCollapse={true}
          maxItemsBeforeExpand={30}
          variant="filter"
          emptyMessage="No related organs found"
          hideHeader={hideHeader}
          borderless={borderless}
        />
      )}
    </>
  )
} 