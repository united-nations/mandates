'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Landmark } from 'lucide-react'
import { useFilters } from '@/contexts/FilterContext'
import { GenericSidebar } from '@/components/ui/generic-sidebar'
import { SidebarListItem } from '@/components/ui/sidebar-list-item'
import { OrganName } from '@/components/ui/organ-name'
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
  entityFilter
}: OrganListSidebarProps) {
  const { filters, setFilter } = useFilters();
  
  const maxCount = Math.max(...organs.map(organ => organ.count), 1)

  const findOrganData = (organName: string): Organ | undefined => {
    return allOrgans.find(organ => 
      organ.short === organName || organ.long === organName
    )
  }

  const handleOrganClick = (organName: string) => {
    if (pageType === 'main') {
      // On main page: Navigate to organ page (simple link - will be handled by Link component)
      return;
    } else {
      // On entity/organ pages: Set as filter
      setFilter('organ', organName);
    }
  };

  // Get description based on page type
  const getDescription = () => {
    if (pageType === 'entity') {
      return `Organs and bodies issuing and number of cited source documents for ${entityFilter}`
    } else {
      return 'Organs and bodies issuing and number of cited source documents'
    }
  }

  // Get variant based on page type
  const variant = pageType === 'main' ? 'navigation' : 'filter'

  // Search filter function
  const searchFilter = (organ: OrganWithCount, searchTerm: string) => {
    const organData = findOrganData(organ.short)
    return organ.short.toLowerCase().includes(searchTerm) ||
           (organData ? organData.long.toLowerCase().includes(searchTerm) : false)
  }

  // Render item function
  const renderItem = (organ: OrganWithCount, index: number, variant: 'navigation' | 'filter') => {
    const item = (
      <SidebarListItem
        key={organ.short}
        label={<OrganName organName={organ.short} allOrgans={allOrgans} showUnderline={true} />}
        count={organ.count}
        maxCount={maxCount}
        isActive={filters.organ === organ.short}
        onClick={() => handleOrganClick(organ.short)}
        variant={variant}
      />
    )

    // For main page, wrap in Link
    if (pageType === 'main') {
      return (
        <Link 
          key={organ.short} 
          href={`/organ/${encodeURIComponent(organ.short)}`}
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
    />
  )
} 