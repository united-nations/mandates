'use client'

import { useState, useEffect } from 'react'
import { Filter, ArrowRight } from 'lucide-react'

interface BodyWithCount {
  name: string
  count: number
}

interface Organ {
  short: string
  long: string
}

interface OrganFilterListProps {
  onOrganClick: (organName: string) => void
  selectedOrgan?: string
}

export function OrganFilterList({ onOrganClick, selectedOrgan }: OrganFilterListProps) {
  const [organs, setOrgans] = useState<BodyWithCount[]>([])
  const [allOrgans, setAllOrgans] = useState<Organ[]>([])
  const [maxCount, setMaxCount] = useState(1)

  useEffect(() => {
    async function fetchData() {
      try {
        const [metaResponse, organsResponse] = await Promise.all([
          fetch('/api/mandates/meta'),
          fetch('/api/organs')
        ])
        if (metaResponse.ok) {
          const metaData = await metaResponse.json()
          const organsData = (metaData.uniqueBodiesWithCount || []).sort((a: BodyWithCount, b: BodyWithCount) => b.count - a.count)
          setOrgans(organsData)
          setMaxCount(Math.max(...organsData.map(o => o.count), 1))
        }
        if (organsResponse.ok) {
          const organsData = await organsResponse.json()
          setAllOrgans(organsData)
        }
      } catch (error) {
        console.error('Failed to fetch organs:', error)
      }
    }
    fetchData()
  }, [])

  const getOrganDisplayName = (organName: string): string => {
    // Since data now uses short names, just return the short name
    // The organName should already be the short name from the updated data
    return organName
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 text-un-blue font-semibold text-base">
        <Filter className="h-4 w-4" />
        Filter by Organ
      </div>
      <div className="space-y-1">
        {organs.map(organ => (
          <button
            key={organ.name}
            className={`group w-full flex items-center gap-2 px-2 py-1 rounded transition-colors ${selectedOrgan === organ.name ? 'bg-un-blue/10 text-un-blue font-bold' : 'hover:bg-muted/40'}`}
            onClick={() => onOrganClick(organ.name)}
          >
            <span className="flex-1 truncate text-left">{getOrganDisplayName(organ.name)}</span>
            <span className="relative flex items-center min-w-[60px]">
              <span className="text-xs font-mono text-un-blue z-10 pr-2">{organ.count}</span>
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-2 rounded bg-un-blue/20" style={{ width: `${Math.max(10, (organ.count / maxCount) * 50)}%`, minWidth: 10 }} />
            </span>
            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-un-blue" />
          </button>
        ))}
      </div>
    </div>
  )
} 