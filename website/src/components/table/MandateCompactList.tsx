'use client'

import { Chip } from '@/components/ui/chip'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useFilters } from '@/contexts/FilterContext'
import type { Entity, Mandate, Organ } from '@/types'
import { ChevronRight } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Fragment, useState } from 'react'
import { getMandateUrl } from './MandateColumns'
import {
  GroupBadge,
  GroupHiddenVersionsNote,
  GroupMemberLine,
  groupHasHiddenVersions,
  SeriesMarkers,
} from './MandateSeriesIndicators'

interface MandateCompactListProps {
  mandates: Mandate[]
  organsData: Organ[]
  entitiesData: Entity[]
}

export function MandateCompactList({ mandates }: MandateCompactListProps) {
  const { filters, isPending } = useFilters()
  const router = useRouter()
  const searchParams = useSearchParams()

  const grouped = filters.group === '1'
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const toggleGroup = (symbol: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(symbol)) next.delete(symbol)
      else next.add(symbol)
      return next
    })
  }

  const handleClick = (mandate: Mandate, e: React.MouseEvent) => {
    e.preventDefault()
    router.push(
      getMandateUrl(
        mandate.full_document_symbol,
        { ppb_version: filters.ppb_version, mode: filters.mode },
        searchParams
      )
    )
  }

  return (
    <TooltipProvider>
      <div
        className={`overflow-hidden rounded-lg border border-gray-200 transition-opacity duration-150 ${isPending ? 'opacity-50' : 'opacity-100'}`}
      >
        {mandates.map((mandate) => {
          const isExpanded = expandedGroups.has(mandate.full_document_symbol)
          const dimmed = !grouped && !!mandate.series?.superseded_by
          return (
            <Fragment key={mandate.full_document_symbol}>
              <div
                onClick={(e) => handleClick(mandate, e)}
                className={`flex cursor-pointer items-center gap-3 border-b border-gray-100 px-3 py-2.5 transition-colors hover:bg-gray-50 ${dimmed ? 'opacity-60' : ''}`}
              >
                {grouped && (
                  <span className="w-11 shrink-0">
                    <GroupBadge
                      mandate={mandate}
                      expanded={isExpanded}
                      onToggle={() => toggleGroup(mandate.full_document_symbol)}
                    />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {mandate.displayTitle || 'Untitled'}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-un-blue">
                      {mandate.full_document_symbol}
                    </span>
                    {(!grouped || (mandate.group?.size ?? 1) <= 1) && (
                      <SeriesMarkers mandate={mandate} />
                    )}
                    {mandate.body && (
                      <>
                        <span className="text-gray-300">·</span>
                        <Chip density="dense" className="whitespace-nowrap">
                          {mandate.body}
                        </Chip>
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
              {grouped &&
                isExpanded &&
                (mandate.group?.members ?? []).map((member) => (
                  <div
                    key={member.symbol}
                    onClick={() =>
                      router.push(
                        getMandateUrl(
                          member.symbol,
                          {
                            ppb_version: filters.ppb_version,
                            mode: filters.mode,
                          },
                          searchParams
                        )
                      )
                    }
                    className="cursor-pointer border-b border-gray-100 bg-gray-50/60 px-3 py-1.5 pl-8 transition-colors hover:bg-gray-100"
                  >
                    <GroupMemberLine member={member} />
                  </div>
                ))}
              {grouped && isExpanded && groupHasHiddenVersions(mandate) && (
                <div
                  onClick={(e) => handleClick(mandate, e)}
                  className="cursor-pointer border-b border-gray-100 bg-gray-50/60 px-3 py-1.5 pl-8 transition-colors hover:bg-gray-100"
                >
                  <GroupHiddenVersionsNote mandate={mandate} />
                </div>
              )}
            </Fragment>
          )
        })}
        {mandates.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No mandates found matching the current filters.
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
