'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Landmark } from 'lucide-react'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { SearchInput } from '@/components/ui/search-input'
import { SidebarListItem } from '@/components/ui/sidebar-list-item'
import { useFilters } from '@/contexts/FilterContext'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
  
  const [filteredOrgans, setFilteredOrgans] = useState<OrganWithCount[]>(organs)
  const [searchTerm, setSearchTerm] = useState('')
  const maxCount = Math.max(...organs.map(organ => organ.count), 1)

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOrgans(organs)
    } else {
      const filtered = organs.filter(organ => {
        const organData = findOrganData(organ.short)
        return organ.short.toLowerCase().includes(searchTerm.toLowerCase()) ||
               (organData && organData.long.toLowerCase().includes(searchTerm.toLowerCase()))
      })
      setFilteredOrgans(filtered)
    }
  }, [searchTerm, organs, allOrgans])

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

  const LoadingSkeletonComponent = () => (
    <LoadingSkeleton variant="sidebar" count={8} />
  )

  return (
    <div className={borderless ? '' : 'border-l-2 border-gray-200 pl-4'}>
      {!hideHeader && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="h-5 w-5 text-un-blue" />
            <h3 className="text-lg font-semibold">UN Organs</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {pageType === 'entity' 
              ? `Organs and number of cited source documents for ${entityFilter}`
              : pageType === 'organ'
              ? 'Click to add organ filter'
              : 'Organs and number of cited source documents'
            }
          </p>
        </div>
      )}
      
      <div className="space-y-3">
        <SearchInput
          placeholder="Search organs..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          variant="border-bottom"
        />
        
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <LoadingSkeletonComponent />
          ) : (
            <div className="space-y-1">
              {filteredOrgans.map((organ) => (
                pageType === 'main' ? (
                  <Link 
                    key={organ.short} 
                    href={`/organ/${encodeURIComponent(organ.short)}`}
                    className="block"
                    prefetch={false}
                  >
                    <SidebarListItem
                      label={<OrganName organName={organ.short} allOrgans={allOrgans} showUnderline={true} />}
                      count={organ.count}
                      maxCount={maxCount}
                      isActive={filters.organ === organ.short}
                      onClick={() => {}} // Empty onClick for Link wrapper
                    />
                  </Link>
                ) : (
                  <SidebarListItem
                    key={organ.short}
                    label={<OrganName organName={organ.short} allOrgans={allOrgans} showUnderline={true} />}
                    count={organ.count}
                    maxCount={maxCount}
                    isActive={filters.organ === organ.short}
                    onClick={() => handleOrganClick(organ.short)}
                  />
                )
              ))}
              {filteredOrgans.length === 0 && !isLoading && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No organs found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper component for organ name display
function OrganName({ organName, allOrgans, showUnderline = true }: { organName: string, allOrgans: Organ[], showUnderline?: boolean }) {
  const organData = allOrgans.find(organ => organ.short === organName || organ.long === organName)
  const displayName = organData?.short || organName
  const longName = organData?.long || organName

  if (displayName === longName) {
    return <>{displayName}</>
  }

  return (
    <Tooltip>
      <TooltipTrigger className={showUnderline ? "underline decoration-dotted cursor-help" : "cursor-help"}>
        {displayName}
      </TooltipTrigger>
      <TooltipContent>
        <p>{longName}</p>
      </TooltipContent>
    </Tooltip>
  )
} 