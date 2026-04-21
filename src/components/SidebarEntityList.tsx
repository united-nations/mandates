'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Building } from 'lucide-react'
import { EntityName } from '@/components/EntityName'
import { useFilters } from '@/contexts/FilterContext'
import { GenericSidebar } from '@/components/SidebarGeneric'
import { SidebarListItem } from '@/components/SidebarListItem'
import { getActiveFiltersText } from '@/lib/utils'
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
  organFilter,
}: EntityListSidebarProps) {
  const { filters, setFilter } = useFilters()
  const router = useRouter()

  const maxCount = Math.max(...entities.map((entity) => entity.count), 1)

  // Build URL with current filters for navigation to entity page
  const buildEntityPageUrl = (entityName: string): string => {
    const params = new URLSearchParams()

    // Add all current filters except 'entity' (since we're navigating to an entity page)
    // and exclude pagination (start fresh on new page)
    Object.entries(filters).forEach(([key, value]) => {
      if (key !== 'entity' && key !== 'page' && value && value !== 'all') {
        params.set(key, value)
      }
    })

    const queryString = params.toString()
    const baseUrl = `/entity/${encodeURIComponent(entityName)}`
    return queryString ? `${baseUrl}?${queryString}` : baseUrl
  }

  const handleEntityClick = (entityName: string) => {
    if (pageType === 'main') {
      // On main page: Navigate to entity page with current filters preserved
      const url = buildEntityPageUrl(entityName)
      router.push(url)
    } else {
      // On entity/organ pages: Set as filter
      setFilter('entity', entityName)
    }
  }

  // Get description based on page type
  const getDescription = () => {
    const activeFiltersText = getActiveFiltersText(
      filters,
      pageType,
      undefined,
      organFilter
    )

    if (pageType === 'organ') {
      return `Entities and number of cited source documents ${activeFiltersText}for ${organFilter}`
    } else {
      return `Entities and number of cited source documents${activeFiltersText ? ' ' + activeFiltersText.trim() : ''}`
    }
  }

  // Get variant based on page type
  const variant = pageType === 'main' ? 'navigation' : 'filter'

  // Search filter function
  const searchFilter = (entity: EntityWithCount, searchTerm: string) => {
    const shortName = entity.entity.toLowerCase()
    const longName = (
      allEntities.find((e) => e.entity === entity.entity)?.entity_long || ''
    ).toLowerCase()
    return shortName.includes(searchTerm) || longName.includes(searchTerm)
  }

  // Render item function
  const renderItem = (
    entity: EntityWithCount,
    index: number,
    variant: 'navigation' | 'filter'
  ) => {
    const entityData = allEntities.find((e) => e.entity === entity.entity)
    const tooltipContent =
      entityData?.entity_long && entityData.entity !== entityData.entity_long
        ? entityData.entity_long
        : undefined

    const item = (
      <SidebarListItem
        key={entity.entity}
        label={
          <EntityName
            entityName={entity.entity}
            entityLong={entityData?.entity_long}
            asChild={true}
          />
        }
        count={entity.count}
        maxCount={maxCount}
        isActive={filters.entity === entity.entity}
        onClick={() => handleEntityClick(entity.entity)}
        variant={variant}
        tooltipContent={tooltipContent}
      />
    )

    // For main page, we handle navigation via onClick in handleEntityClick
    // No need to wrap in Link anymore since we're using router.push with filters
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
      emptyMessage="No entities found. Note that the beta version only includes entities that are part of the UN Secretariat. This will be expanded in the coming weeks."
      showExpandCollapse={true}
      maxItemsBeforeExpand={10}
    />
  )
}
