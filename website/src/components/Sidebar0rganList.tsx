'use client'

import React from 'react'
import { Landmark } from 'lucide-react'
import { useFilters } from '@/contexts/FilterContext'
import { GenericSidebar } from '@/components/SidebarGeneric'
import { SidebarListItem } from '@/components/SidebarListItem'
import { OrganName } from '@/components/OrganName'
import type { OrganWithCount, Organ } from '@/types'

interface OrganListSidebarProps {
  organs: OrganWithCount[]
  allOrgans: Organ[]
  isLoading?: boolean
  hideHeader?: boolean
  borderless?: boolean
}

export function OrganListSidebar({
  organs,
  allOrgans,
  isLoading = false,
  hideHeader = false,
  borderless = false,
}: OrganListSidebarProps) {
  const { filters, setFilter } = useFilters()

  const maxCount = Math.max(...organs.map((organ) => organ.count), 1)

  const findOrganData = (organName: string): Organ | undefined => {
    return allOrgans.find(
      (organ) => organ.short === organName || organ.long === organName
    )
  }

  const handleOrganClick = (organName: string) => {
    setFilter('organ', organName)
  }

  const getDescription = () => {
    return 'Organs and bodies issuing mandates and number of cited source documents'
  }

  const searchFilter = (organ: OrganWithCount, searchTerm: string) => {
    const organData = findOrganData(organ.short)
    return (
      organ.short.toLowerCase().includes(searchTerm) ||
      (organData ? organData.long.toLowerCase().includes(searchTerm) : false)
    )
  }

  const renderItem = (
    organ: OrganWithCount,
    _index: number,
    variant: 'navigation' | 'filter'
  ) => {
    const organData = findOrganData(organ.short)
    const tooltipContent =
      organData && organData.short !== organData.long
        ? organData.long
        : undefined

    return (
      <SidebarListItem
        key={organ.short}
        label={
          <OrganName
            organName={organ.short}
            allOrgans={allOrgans}
            asChild={true}
          />
        }
        count={organ.count}
        maxCount={maxCount}
        isActive={filters.organ === organ.short}
        onClick={() => handleOrganClick(organ.short)}
        variant={variant}
        tooltipContent={tooltipContent}
      />
    )
  }

  return (
    <GenericSidebar
      icon={Landmark}
      title="UN Organs & Bodies"
      description={getDescription()}
      items={organs}
      isLoading={isLoading}
      searchPlaceholder="Search organs and bodies..."
      searchFilter={searchFilter}
      renderItem={renderItem}
      hideHeader={hideHeader}
      borderless={borderless}
      variant="filter"
      emptyMessage="No organs found"
      showExpandCollapse={true}
      maxItemsBeforeExpand={4}
    />
  )
}
