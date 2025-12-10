'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Landmark } from 'lucide-react'
import { useFilters } from '@/contexts/FilterContext'
import { GenericSidebar } from '@/components/SidebarGeneric'
import { SidebarListItem } from '@/components/SidebarListItem'
import { OrganName } from '@/components/OrganName'
import { getActiveFiltersText } from '@/lib/utils'
import type { OrganWithCount, Organ } from '@/types'

interface OrganListSidebarProps {
  organs: OrganWithCount[]
  allOrgans: Organ[]
  isLoading?: boolean
  hideHeader?: boolean
  borderless?: boolean
  pageType: 'main' | 'entity' | 'organ'
  entityFilter?: string
}

export function OrganListSidebar({
  organs,
  allOrgans,
  isLoading = false,
  hideHeader = false,
  borderless = false,
  pageType,
  entityFilter,
}: OrganListSidebarProps) {
  const { filters, setFilter } = useFilters()
  const router = useRouter()

  const maxCount = Math.max(...organs.map((organ) => organ.count), 1)

  const findOrganData = (organName: string): Organ | undefined => {
    return allOrgans.find(
      (organ) => organ.short === organName || organ.long === organName
    )
  }

  // Build URL with current filters for navigation to organ page
  const buildOrganPageUrl = (organName: string): string => {
    const params = new URLSearchParams()

    // Add all current filters except 'organ' (since we're navigating to an organ page)
    // and exclude pagination (start fresh on new page)
    Object.entries(filters).forEach(([key, value]) => {
      if (key !== 'organ' && key !== 'page' && value && value !== 'all') {
        params.set(key, value)
      }
    })

    const queryString = params.toString()
    const baseUrl = `/organ/${encodeURIComponent(organName)}`
    return queryString ? `${baseUrl}?${queryString}` : baseUrl
  }

  const handleOrganClick = (organName: string) => {
    if (pageType === 'main') {
      // On main page: Navigate to organ page with current filters preserved
      const url = buildOrganPageUrl(organName)
      router.push(url)
    } else {
      // On entity/organ pages: Set as filter
      setFilter('organ', organName)
    }
  }

  // Get description based on page type
  const getDescription = () => {
    const activeFiltersText = getActiveFiltersText(
      filters,
      pageType,
      entityFilter,
      undefined
    )

    if (pageType === 'entity') {
      return `Organs and bodies issuing and number of cited source documents ${activeFiltersText}for ${entityFilter}`
    } else {
      return `Organs and bodies issuing and number of cited source documents${activeFiltersText ? ' ' + activeFiltersText.trim() : ''}`
    }
  }

  // Get variant based on page type
  const variant = pageType === 'main' ? 'navigation' : 'filter'

  // Search filter function
  const searchFilter = (organ: OrganWithCount, searchTerm: string) => {
    const organData = findOrganData(organ.short)
    return (
      organ.short.toLowerCase().includes(searchTerm) ||
      (organData ? organData.long.toLowerCase().includes(searchTerm) : false)
    )
  }

  // Render item function
  const renderItem = (
    organ: OrganWithCount,
    index: number,
    variant: 'navigation' | 'filter'
  ) => {
    const organData = findOrganData(organ.short)
    const tooltipContent =
      organData && organData.short !== organData.long
        ? organData.long
        : undefined

    const item = (
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

    // For main page, we handle navigation via onClick in handleOrganClick
    // No need to wrap in Link anymore since we're using router.push with filters
    return item
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
      variant={variant}
      emptyMessage="No organs found"
      showExpandCollapse={true}
      maxItemsBeforeExpand={4}
    />
  )
}
