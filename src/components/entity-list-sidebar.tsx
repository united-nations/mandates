'use client'

import { useState, useEffect } from 'react'

import { Input } from '@/components/ui/input'

import { Building, Search, ArrowRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EntityName } from '@/components/ui/entity-name'

interface EntityWithCount {
  name: string
  count: number
}

interface EntityListSidebarProps {
  onEntityClick: (entityName: string) => void
}

export function EntityListSidebar({ onEntityClick }: EntityListSidebarProps) {
  const [entities, setEntities] = useState<EntityWithCount[]>([])
  const [filteredEntities, setFilteredEntities] = useState<EntityWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [maxCount, setMaxCount] = useState(1)

  useEffect(() => {
    async function fetchEntities() {
      try {
        const response = await fetch('/api/mandates/meta')
        const data = await response.json()
        const entitiesData = (data.uniqueEntities || []).sort((a: EntityWithCount, b: EntityWithCount) => 
          b.count - a.count
        )
        setEntities(entitiesData)
        setFilteredEntities(entitiesData)
        setMaxCount(Math.max(...entitiesData.map(e => e.count), 1))
      } catch (error) {
        console.error('Failed to fetch entities:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchEntities()
  }, [])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEntities(entities)
    } else {
      const filtered = entities.filter(entity =>
        entity.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredEntities(filtered)
    }
  }, [searchTerm, entities])

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
    <div className="border-l-2 border-un-blue/20 pl-4">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Building className="h-5 w-5 text-un-blue" />
          <h3 className="text-lg font-semibold">UN Entities</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Entities that cite mandate documents
        </p>
      </div>
      
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entities..."
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
              {filteredEntities.slice(0, 50).map((entity) => (
                <div
                  key={entity.name}
                  className="flex items-center justify-between p-2 rounded-sm hover:bg-muted/30 cursor-pointer group border-b border-muted/30 last:border-b-0"
                  onClick={() => onEntityClick(entity.name)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {entity.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      <EntityName entityName={entity.name} showUnderline={false} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="relative flex items-center min-w-[60px]">
                      <span className="text-xs font-mono text-un-blue z-10 pr-2">{entity.count}</span>
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-2 rounded bg-un-blue/20" style={{ width: `${Math.max(10, (entity.count / maxCount) * 50)}%`, minWidth: 10 }} />
                    </span>
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-un-blue" />
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
        
        {filteredEntities.length > 50 && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t border-muted/30">
            Showing top 50 of {filteredEntities.length} entities
          </div>
        )}
      </div>
    </div>
  )
} 