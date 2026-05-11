'use client'

import { EntityName } from '@/components/EntityName'
import { GenericSidebar } from '@/components/SidebarGeneric'
import { SidebarListItem } from '@/components/SidebarListItem'
import { useFilters } from '@/contexts/FilterContext'
import { getActiveFiltersText } from '@/lib/utils'
import type { CrossCitation, Entity } from '@/types'
import { Link as LinkIcon } from 'lucide-react'

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
  borderless = false,
}: CrossCitationsSidebarProps) {
  const { filters, setFilter } = useFilters()

  const handleEntityClick = (entityName: string) => {
    // On entity/organ pages: Set as crossCitingEntity filter to show intersection
    setFilter('crossCitingEntity', entityName)
  }

  // Find max for bar scaling
  const maxEntityCount =
    crossCitations.length > 0
      ? Math.max(...crossCitations.map((c) => c.count))
      : 1

  // Search filter function
  const searchFilter = (citation: CrossCitation, searchTerm: string) => {
    const shortName = citation.entity.toLowerCase()
    const longName = (citation.entity_long || '').toLowerCase()
    const entityLong =
      allEntities
        .find((e) => e.entity === citation.entity)
        ?.entity_long?.toLowerCase() || ''

    return (
      shortName.includes(searchTerm) ||
      longName.includes(searchTerm) ||
      entityLong.includes(searchTerm)
    )
  }

  // Render item function for entities
  const renderEntityItem = (
    citation: CrossCitation,
    index: number,
    variant: 'navigation' | 'filter'
  ) => (
    <SidebarListItem
      key={citation.entity}
      label={
        <EntityName
          entityName={citation.entity}
          entityLong={
            allEntities.find((e) => e.entity === citation.entity)?.entity_long
          }
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

  // Get active filters text
  const activeFiltersText = getActiveFiltersText(
    filters,
    pageType,
    entityFilter,
    organFilter
  )

  return (
    <GenericSidebar
      icon={LinkIcon}
      title="Cross-Citations"
      description={`Other entities and the number of source documents ${activeFiltersText}cited by both ${entityFilter} and the other entities`}
      items={crossCitations}
      isLoading={isLoading}
      searchPlaceholder="Search entities..."
      searchFilter={searchFilter}
      renderItem={renderEntityItem}
      showExpandCollapse={true}
      maxItemsBeforeExpand={10}
      variant="filter"
      emptyMessage="No cross-citations found"
      hideHeader={hideHeader}
      borderless={borderless}
    />
  )
}
