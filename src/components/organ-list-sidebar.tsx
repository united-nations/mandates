'use client'

import { useState, useEffect } from 'react'

import { Input } from '@/components/ui/input'

import { Landmark, Search, ArrowRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface BodyWithCount {
  name: string
  count: number
}

interface Organ {
  short: string
  long: string
}

interface OrganListSidebarProps {
  onOrganClick: (organName: string) => void
}

export function OrganListSidebar({ onOrganClick }: OrganListSidebarProps) {
  const [organs, setOrgans] = useState<BodyWithCount[]>([])
  const [allOrgans, setAllOrgans] = useState<Organ[]>([])
  const [filteredOrgans, setFilteredOrgans] = useState<BodyWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function fetchData() {
      try {
        const [metaResponse, organsResponse] = await Promise.all([
          fetch('/api/mandates/meta'),
          fetch('/api/organs')
        ])
        
        if (metaResponse.ok) {
          const metaData = await metaResponse.json()
          const organsData = (metaData.uniqueBodiesWithCount || []).sort((a: BodyWithCount, b: BodyWithCount) => 
            b.count - a.count
          )
          setOrgans(organsData)
          setFilteredOrgans(organsData)
        }
        
        if (organsResponse.ok) {
          const organsData = await organsResponse.json()
          setAllOrgans(organsData)
        }
      } catch (error) {
        console.error('Failed to fetch organs:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

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

  const getOrganDisplayName = (organName: string): string => {
    const organData = findOrganData(organName)
    if (organName === "General Assembly" || organName === "Security Council") {
      return organName
    }
    return organData ? `${organData.short} – ${organData.long}` : organName
  }

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

  return (
    <div className="border-l-2 border-un-blue/20 pl-4">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Landmark className="h-5 w-5 text-un-blue" />
          <h3 className="text-lg font-semibold">UN Organs</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Bodies that issue mandate documents
        </p>
      </div>
      
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
                  className="flex items-center justify-between p-2 rounded-sm hover:bg-muted/30 cursor-pointer group border-b border-muted/30 last:border-b-0"
                  onClick={() => onOrganClick(organ.name)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {getOrganDisplayName(organ.name)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                      {organ.count}
                    </span>
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-un-blue" />
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