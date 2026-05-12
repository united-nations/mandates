'use client'

import { EntityName } from '@/components/EntityName'
import { GenericSidebar } from '@/components/SidebarGeneric'
import { SidebarListItem } from '@/components/SidebarListItem'
import { useFilters } from '@/contexts/FilterContext'
import type { Entity, EntityWithCount } from '@/types'
import { Building } from 'lucide-react'

interface EntityListSidebarProps {
  entities: EntityWithCount[]
  allEntities: Entity[]
  isLoading?: boolean
  hideHeader?: boolean
  borderless?: boolean
}

export function EntityListSidebar({
  entities,
  allEntities,
  isLoading = false,
  hideHeader = false,
  borderless = false,
}: EntityListSidebarProps) {
  const { filters, setFilter } = useFilters()

  const maxCount = Math.max(...entities.map((entity) => entity.count), 1)

  const handleEntityClick = (entityName: string) => {
    setFilter('entity', entityName)
  }

  const getDescription = () => {
    return 'Entities and number of cited source documents'
  }

  const searchFilter = (entity: EntityWithCount, searchTerm: string) => {
    const shortName = entity.entity.toLowerCase()
    const longName = (
      allEntities.find((e) => e.entity === entity.entity)?.entity_long || ''
    ).toLowerCase()
    return shortName.includes(searchTerm) || longName.includes(searchTerm)
  }

  const renderItem = (
    entity: EntityWithCount,
    _index: number,
    variant: 'navigation' | 'filter'
  ) => {
    const entityData = allEntities.find((e) => e.entity === entity.entity)
    const tooltipContent =
      entityData?.entity_long && entityData.entity !== entityData.entity_long
        ? entityData.entity_long
        : undefined

    return (
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
      variant="filter"
      emptyMessage="No entities found. Note that this version only includes entities that are part of the UN Secretariat. This will be expanded in the coming weeks."
      showExpandCollapse={true}
      maxItemsBeforeExpand={10}
    />
  )
}
