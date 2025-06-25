'use client'

import { useState, useEffect } from 'react'
import { Filter, ArrowRight } from 'lucide-react'

interface EntityWithCount {
  name: string
  count: number
}

interface EntityFilterListProps {
  onEntityClick: (entityName: string) => void
  selectedEntity?: string
}

export function EntityFilterList({ onEntityClick, selectedEntity }: EntityFilterListProps) {
  const [entities, setEntities] = useState<EntityWithCount[]>([])
  const [maxCount, setMaxCount] = useState(1)

  useEffect(() => {
    async function fetchEntities() {
      try {
        const response = await fetch('/api/mandates/meta')
        const data = await response.json()
        const entitiesData = (data.uniqueEntities || []).sort((a: EntityWithCount, b: EntityWithCount) => b.count - a.count)
        setEntities(entitiesData)
        setMaxCount(Math.max(...entitiesData.map(e => e.count), 1))
      } catch (error) {
        console.error('Failed to fetch entities:', error)
      }
    }
    fetchEntities()
  }, [])

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 text-un-blue font-semibold text-base">
        <Filter className="h-4 w-4" />
        Filter by Entity
      </div>
      <div className="space-y-1">
        {entities.slice(0, 30).map(entity => (
          <button
            key={entity.name}
            className={`group w-full flex items-center gap-2 px-2 py-1 rounded transition-colors ${selectedEntity === entity.name ? 'bg-un-blue/10 text-un-blue font-bold' : 'hover:bg-muted/40'}`}
            onClick={() => onEntityClick(entity.name)}
          >
            <span className="flex-1 truncate text-left">{entity.name}</span>
            <span className="relative flex items-center min-w-[60px]">
              <span className="text-xs font-mono text-un-blue z-10 pr-2">{entity.count}</span>
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-2 rounded bg-un-blue/20" style={{ width: `${Math.max(10, (entity.count / maxCount) * 50)}%`, minWidth: 10 }} />
            </span>
            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-un-blue" />
          </button>
        ))}
      </div>
    </div>
  )
} 