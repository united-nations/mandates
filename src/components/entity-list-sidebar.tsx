'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Building, Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EntityName } from '@/components/ui/entity-name'
import { useFilters } from '@/contexts/FilterContext'

interface EntityWithCount {
  name: string
  count: number
}

interface EntityDetails {
  Entity: string
  'Entity-Long': string
}

interface EntityListSidebarProps {
  hideHeader?: boolean
  borderless?: boolean
}

export function EntityListSidebar({ hideHeader = false, borderless = false }: EntityListSidebarProps) {
  const router = useRouter();
  const { filters, setFilter, isOrganPage, isMainPage, currentOrganName } = useFilters();
  
  const [entities, setEntities] = useState<EntityWithCount[]>([])
  const [filteredEntities, setFilteredEntities] = useState<EntityWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [maxCount, setMaxCount] = useState(1)
  const [allEntities, setAllEntities] = useState<EntityDetails[]>([])

  useEffect(() => {
    async function fetchEntities() {
      try {
        // Build parameters with all current filters (excluding entity filter to get counts for all entities)
        const params = new URLSearchParams()
        
        // Add all filters except entity (since we want counts for all entities)
        Object.entries(filters).forEach(([key, value]) => {
          if (key !== 'entity' && key !== 'page' && key !== 'limit' && key !== 'sort_by' && value && value !== 'all') {
            params.set(key, value)
          }
        })
        
        let url = '/api/mandates/meta'
        if (params.toString()) {
          url += `?${params.toString()}`
        }
        
        const response = await fetch(url)
        const data = await response.json()
        
        // Deduplicate by name (case-insensitive)
        const seen = new Set<string>()
        const entitiesData = (data.uniqueEntities || [])
          .filter((entity: EntityWithCount) => {
            const key = entity.name.trim().toLowerCase()
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          .sort((a: EntityWithCount, b: EntityWithCount) => b.count - a.count)
        setEntities(entitiesData)
        setFilteredEntities(entitiesData)
        setMaxCount(Math.max(...entitiesData.map((entity: EntityWithCount) => entity.count), 1))
      } catch (error) {
        console.error('Failed to fetch entities:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchEntities()
  }, [filters])

  useEffect(() => {
    async function fetchAllEntities() {
      try {
        const res = await fetch('/api/entities')
        if (res.ok) {
          const data = await res.json()
          setAllEntities(data)
        }
      } catch (error) {
        console.error('Failed to fetch all entities:', error)
      }
    }
    fetchAllEntities()
  }, [])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEntities(entities)
    } else {
      const lowerSearch = searchTerm.toLowerCase()
      const filtered = entities.filter(entity => {
        const shortName = entity.name.toLowerCase()
        const longName = (allEntities.find(e => e.Entity === entity.name)?.['Entity-Long'] || '').toLowerCase()
        return shortName.includes(lowerSearch) || longName.includes(lowerSearch)
      })
      setFilteredEntities(filtered)
    }
  }, [searchTerm, entities, allEntities])

  const handleEntityClick = (entityName: string) => {
    if (isMainPage) {
      // Navigate to entity page (fresh, no filters preserved)
      router.push(`/entity/${encodeURIComponent(entityName)}`);
      // Jump to top after navigation
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
    } else if (isOrganPage) {
      // Set entity filter on organ page
      setFilter('entity', entityName);
    }
  };

  const LoadingSkeleton = () => (
    <div className="space-y-2">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-8" />
        </div>
      ))}
    </div>
  )

  return (
    <div className={borderless ? '' : 'border-l-2 border-gray-200 pl-4'}>
      {!hideHeader && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Building className="h-5 w-5 text-un-blue" />
            <h3 className="text-lg font-semibold">UN Entities</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {isOrganPage 
              ? `Entities citing ${currentOrganName} mandate documents`
              : 'Entities citing mandate documents'
            }
          </p>
        </div>
      )}
      
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entities..."
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
              {filteredEntities.map((entity) => (
                <div
                  key={entity.name}
                  className={`flex items-center justify-between p-2 rounded-sm hover:bg-muted/30 cursor-pointer group border-b border-muted/30 last:border-b-0 ${
                    filters.entity === entity.name ? 'bg-un-blue/10 border-un-blue/30' : ''
                  }`}
                  onClick={() => handleEntityClick(entity.name)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      <EntityName entityName={entity.name} asChild={true} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 w-32">
                    <span className="flex items-center w-full">
                      <span className="text-xs font-mono text-un-blue text-right pr-2 min-w-[28px] max-w-[32px] flex-shrink-0 justify-end flex">{entity.count.toLocaleString()}</span>
                      <span className="relative flex-1 h-2 bg-un-blue/10 rounded">
                        <span className="absolute left-0 top-0 h-2 rounded bg-un-blue/60" style={{ width: `${(entity.count / maxCount) * 100}%`, minWidth: 2 }} />
                      </span>
                    </span>
                  </div>
                </div>
              ))}
              {filteredEntities.length === 0 && !isLoading && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No entities found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 