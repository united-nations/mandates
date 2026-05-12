'use client'

import { useFilters } from '@/contexts/FilterContext'
import type { Entity, Mandate, Organ } from '@/types'
import { ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getMandateUrl } from './MandateColumns'

interface MandateCompactListProps {
  mandates: Mandate[]
  organsData: Organ[]
  entitiesData: Entity[]
}

export function MandateCompactList({
  mandates,
}: MandateCompactListProps) {
  const { isPending } = useFilters()
  const router = useRouter()

  const handleClick = (mandate: Mandate, e: React.MouseEvent) => {
    e.preventDefault()
    router.push(getMandateUrl(mandate.full_document_symbol))
  }

  return (
    <div
      className={`rounded-lg border border-gray-200 overflow-hidden transition-opacity duration-150 ${isPending ? 'opacity-50' : 'opacity-100'}`}
    >
      {mandates.map((mandate) => (
        <div
          key={mandate.full_document_symbol}
          onClick={(e) => handleClick(mandate, e)}
          className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-3 py-2.5 transition-colors hover:bg-gray-50"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {mandate.displayTitle || 'Untitled'}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-un-blue">
                {mandate.full_document_symbol}
              </span>
              {mandate.body && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>{mandate.body}</span>
                </>
              )}
              {mandate.year && mandate.year !== '-' && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>{mandate.year}</span>
                </>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      ))}
      {mandates.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No mandates found matching the current filters.
        </div>
      )}
    </div>
  )
}
