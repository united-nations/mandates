'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Landmark, Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useFilters } from '@/contexts/FilterContext'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface BodyWithCount {
  name: string
  count: number
}

interface Organ {
  short: string
  long: string
}

interface OrganListSidebarProps {
  hideHeader?: boolean
  borderless?: boolean
}

export function OrganListSidebar({ hideHeader = false, borderless = false }: OrganListSidebarProps) {
  const router = useRouter();
  const { filters, setFilter, isEntityPage, isMainPage, currentEntityName } = useFilters();
  
  const [organs, setOrgans] = useState<BodyWithCount[]>([])
  const [allOrgans, setAllOrgans] = useState<Organ[]>([])
  const [filteredOrgans, setFilteredOrgans] = useState<BodyWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [maxCount, setMaxCount] = useState(1)

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        let organsData: BodyWithCount[] = []
        
        if (isEntityPage && currentEntityName) {
          // Fetch mandates for the current entity to get organ counts
          const params = new URLSearchParams({
            entity: currentEntityName,
            limit: '1000' // Get all mandates to count organs accurately
          })
          const res = await fetch(`/api/mandates?${params.toString()}`)
          if (res.ok) {
            const data = await res.json()
            const organCounts: { [key: string]: number } = {}
            
            // Count mandates by organ - the API returns items, not mandates
            const mandates = data.items || data.mandates || []
            mandates.forEach((mandate: any) => {
              if (mandate.body) {
                organCounts[mandate.body] = (organCounts[mandate.body] || 0) + 1
              }
            })
            
            organsData = Object.entries(organCounts)
              .map(([name, count]) => ({ name, count }))
              .sort((a: BodyWithCount, b: BodyWithCount) => b.count - a.count)
          }
        }
        
        // Always fetch organ details for name mapping
        const organsResponse = await fetch('/api/organs')
        if (organsResponse.ok) {
          const organsList = await organsResponse.json()
          setAllOrgans(organsList)
        }
        
        if (!isEntityPage || organsData.length === 0) {
          // Fallback to all organs
          const metaResponse = await fetch('/api/mandates/meta')
          if (metaResponse.ok) {
            const metaData = await metaResponse.json()
            organsData = (metaData.uniqueBodiesWithCount || []).sort((a: BodyWithCount, b: BodyWithCount) => b.count - a.count)
          }
        }
        
        // Deduplicate by name (case-insensitive)
        const seen = new Set<string>()
        organsData = organsData.filter((organ: BodyWithCount) => {
          const key = organ.name.trim().toLowerCase()
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        
        setOrgans(organsData)
        setFilteredOrgans(organsData)
        setMaxCount(Math.max(...organsData.map((organ: BodyWithCount) => organ.count), 1))
      } catch (error) {
        console.error('Failed to fetch organs:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [isEntityPage, currentEntityName])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOrgans(organs)
    } else {
      const filtered = organs.filter(organ => {
        const organData = findOrganData(organ.name)
        return organ.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    if (isMainPage) {
      // Navigate to organ page (fresh, no filters preserved)
      router.push(`/organ/${encodeURIComponent(organName)}`);
    } else if (isEntityPage) {
      // Set organ filter on entity page
      setFilter('organ', organName);
    }
  };

  const LoadingSkeleton = () => (
    <div className="space-y-2">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-8" />
        </div>
      ))}
    </div>
  )

  // Add OrganName component
  function OrganName({ organName, allOrgans, showUnderline = true }: { organName: string, allOrgans: Organ[], showUnderline?: boolean }) {
    const found = allOrgans.find((o) => o.short === organName || o.long === organName);
    const longName = found ? found.long : null;
    if (!longName || longName === organName) return <>{organName}</>;
    return (
      <Tooltip>
        <TooltipTrigger className={showUnderline ? 'underline decoration-dotted cursor-help' : 'cursor-help'}>
          {organName}
        </TooltipTrigger>
        <TooltipContent>
          <p>{longName}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={borderless ? '' : 'border-l-2 border-un-blue/20 pl-4'}>
      {!hideHeader && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="h-5 w-5 text-un-blue" />
            <h3 className="text-lg font-semibold">UN Organs</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {isEntityPage 
              ? `Bodies issuing mandate documents cited by ${currentEntityName}`
              : 'Bodies issuing mandate documents'
            }
          </p>
        </div>
      )}
      
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organs..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="pl-10 h-9 text-sm border-0 border-b border-muted bg-transparent focus-visible:ring-0 focus-visible:border-un-blue rounded-none"
          />
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <div className="space-y-1">
              {filteredOrgans.map((organ) => (
                <div
                  key={organ.name}
                  className={`flex items-center justify-between p-2 rounded-sm hover:bg-muted/30 cursor-pointer group border-b border-muted/30 last:border-b-0 ${
                    filters.organ === organ.name ? 'bg-un-blue/10 border-un-blue/30' : ''
                  }`}
                  onClick={() => handleOrganClick(organ.name)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {/* Use OrganName for abbreviation explainer */}
                      <OrganName organName={findOrganData(organ.name)?.short || organ.name} allOrgans={allOrgans} showUnderline={true} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 w-32">
                    <span className="flex items-center w-full">
                      <span className="text-xs font-mono text-un-blue text-right pr-2 min-w-[28px] max-w-[32px] flex-shrink-0 justify-end flex">{organ.count}</span>
                      <span className="relative flex-1 h-2 bg-un-blue/10 rounded">
                        <span className="absolute left-0 top-0 h-2 rounded bg-un-blue/60" style={{ width: `${(organ.count / maxCount) * 100}%`, minWidth: 2 }} />
                      </span>
                    </span>
                  </div>
                </div>
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