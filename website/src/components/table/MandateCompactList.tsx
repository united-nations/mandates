'use client'

import { DocumentSymbol } from '@/components/DocumentSymbol'
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
  groupMemberEntries,
  SeriesMarkers,
} from './MandateSeriesIndicators'

interface MandateCompactListProps {
  mandates: Mandate[]
  organsData: Organ[]
  entitiesData: Entity[]
}

export function MandateCompactList({ mandates }: MandateCompactListProps) {
  const { filters, setFilter, isPending } = useFilters()
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
        { ppb_version: filters.ppb_version },
        searchParams
      )
    )
  }

  return (
    <TooltipProvider>
      <div
        className={`overflow-hidden rounded-lg border border-border transition-opacity duration-150 ${isPending ? 'opacity-50' : 'opacity-100'}`}
      >
        {mandates.map((mandate) => {
          const isExpanded = expandedGroups.has(mandate.full_document_symbol)

          return (
            <Fragment key={mandate.full_document_symbol}>
              <div
                onClick={(e) => handleClick(mandate, e)}
                className={`flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2.5 transition-colors hover:bg-muted`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {mandate.displayTitle || 'Untitled'}
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-2 text-sm text-muted-foreground">
                    <DocumentSymbol>{mandate.full_document_symbol}</DocumentSymbol>
                    {/* Right of the symbol, same as the table: the count is a
                        property of the symbol it follows. */}
                    {grouped && (
                      <GroupBadge
                        mandate={mandate}
                        expanded={isExpanded}
                        onToggle={() =>
                          toggleGroup(mandate.full_document_symbol)
                        }
                      />
                    )}
                    {(!grouped || (mandate.group?.size ?? 1) <= 1) && (
                      <SeriesMarkers mandate={mandate} />
                    )}
                    {mandate.body && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <Chip
                          density="dense"
                          className="whitespace-nowrap"
                          onClick={(event) => {
                            event.stopPropagation()
                            setFilter('organ', mandate.body)
                          }}
                          aria-label={`Filter by ${mandate.body}`}
                        >
                          {mandate.body}
                        </Chip>
                      </>
                    )}
                    {mandate.year && mandate.year !== '-' && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span>{mandate.year}</span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
              {grouped &&
                isExpanded &&
                groupMemberEntries(mandate).map((member) => (
                  <div
                    key={member.symbol}
                    onClick={() =>
                      router.push(
                        getMandateUrl(
                          member.symbol,
                          { ppb_version: filters.ppb_version },
                          searchParams
                        )
                      )
                    }
                    className="cursor-pointer border-b border-border bg-muted/60 px-3 py-1.5 pl-8 transition-colors hover:bg-secondary"
                  >
                    <GroupMemberLine member={member} />
                  </div>
                ))}
              {grouped && isExpanded && groupHasHiddenVersions(mandate) && (
                <div
                  onClick={(e) => handleClick(mandate, e)}
                  className="cursor-pointer border-b border-border bg-muted/60 px-3 py-1.5 pl-8 transition-colors hover:bg-secondary"
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
