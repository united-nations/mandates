'use client'

import { SidebarListItem } from '@/components/SidebarListItem'
import { useFilters } from '@/contexts/FilterContext'
import type { CitationBin } from '@/types'

interface CitationDistributionProps {
  bins: CitationBin[]
}

export function CitationDistribution({ bins }: CitationDistributionProps) {
  const { filters, setMultipleFilters } = useFilters()

  const maxCount = Math.max(...bins.map((b) => b.count), 1)

  const isActive = (bin: CitationBin) =>
    filters.min_citations === bin.minCitations.toString() &&
    filters.max_citations === bin.maxCitations.toString()

  const handleClick = (bin: CitationBin) => {
    if (isActive(bin)) {
      setMultipleFilters({
        min_citations: undefined,
        max_citations: undefined,
      })
    } else {
      setMultipleFilters({
        min_citations: bin.minCitations.toString(),
        max_citations: bin.maxCitations.toString(),
      })
    }
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">
        Documents by number of citations
      </p>
      {bins.map((bin) => (
        <SidebarListItem
          key={bin.bin}
          label={`${bin.bin} citation${bin.bin === '1' ? '' : 's'}`}
          count={bin.count}
          maxCount={maxCount}
          isActive={isActive(bin)}
          onClick={() => handleClick(bin)}
          variant="filter"
        />
      ))}
      {bins.length === 0 && (
        <div className="py-4 text-center text-sm text-muted-foreground">
          No citation data available
        </div>
      )}
    </div>
  )
}
