'use client'

import { ClickTooltip } from '@/components/DirectoryControls'
import { ChartSearchInput } from '@/components/ui/chart-search-input'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSectionFilter } from '@/hooks/use-section-filter'
import { cn } from '@/lib/utils'
import type { OrganGroup, OrganWithCount } from '@/types'
import { ChevronRight, ExternalLink } from 'lucide-react'
import { useMemo, useState } from 'react'

/**
 * The organ directory: every intergovernmental organ that adopts mandates,
 * grouped by its place in the UN system (see lib/organ-groups.ts). Reads the
 * same category structure the table's Organ filter groups by (getOrganHierarchy).
 *
 * On the single page, selecting an organ sets a single-facet view of the
 * mandates section and scrolls to it (see useSectionFilter); the active organ
 * is highlighted.
 *
 * One view only: cards with names. There are ~23 organs in all, so the compact
 * acronym-pill view the entity directory still needs bought nothing here except
 * a toggle to get wrong — it was removed along with its localStorage pref.
 */

interface OrgansDirectoryProps {
  groups: OrganGroup[]
}

export function OrgansDirectory({ groups }: OrgansDirectoryProps) {
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()
  const { active, select } = useSectionFilter('organ')

  const totalOrgans = useMemo(
    () => groups.reduce((n, g) => n + g.organs.length, 0),
    [groups]
  )

  const filtered = useMemo(() => {
    if (!term) return groups
    return groups
      .map((g) => ({
        ...g,
        organs: g.organs.filter(
          (o) =>
            o.short.toLowerCase().includes(term) ||
            o.long.toLowerCase().includes(term)
        ),
      }))
      .filter((g) => g.organs.length > 0)
  }, [groups, term])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <ChartSearchInput
          placeholder="Search organs by acronym or name..."
          value={search}
          onChange={setSearch}
        />

        {filtered.length > 0 ? (
          <div className="space-y-6">
            {filtered.map((group) => (
              <div key={group.id}>
                <GroupHeading>{group.label}</GroupHeading>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {group.organs.map((organ) => (
                    <OrganCard
                      key={organ.short}
                      organ={organ}
                      active={active === organ.short}
                      onSelect={select}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No organs match “{search.trim()}”.
          </p>
        )}

        {!term && (
          <p className="pt-2 text-xs text-gray-500">
            {totalOrgans} organs adopting mandates.
          </p>
        )}
      </div>
    </TooltipProvider>
  )
}

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-gray-200 pb-1.5 text-sm font-normal tracking-wide text-gray-600 uppercase">
      {children}
    </h2>
  )
}

function OrganCard({
  organ,
  active,
  onSelect,
}: {
  organ: OrganWithCount
  active: boolean
  onSelect: (value: string) => void
}) {
  const hasLong = organ.long && organ.long !== organ.short

  return (
    <div
      className={cn(
        'group flex items-start justify-between gap-2 rounded-lg border bg-white px-3 py-2 transition-all',
        active
          ? 'border-un-blue'
          : 'border-gray-200 hover:border-un-blue hover:shadow-md'
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={`/secretariat?organ=${encodeURIComponent(organ.short)}`}
            onClick={(e) => {
              e.preventDefault()
              onSelect(organ.short)
            }}
            className="min-w-0 flex-1 focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none"
          >
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  'text-sm font-semibold',
                  active ? 'text-un-blue' : 'text-gray-900'
                )}
              >
                {organ.short}
              </span>
              <span className="text-[10px] text-gray-500">{organ.count}</span>
            </div>
            {hasLong && (
              <div className="truncate text-xs text-gray-500">{organ.long}</div>
            )}
          </a>
        </TooltipTrigger>
        <ClickTooltip name={hasLong ? organ.long : undefined} />
      </Tooltip>

      <div className="mt-0.5 flex shrink-0 items-center gap-1">
        {organ.website && (
          <a
            href={organ.website}
            target="_blank"
            rel="noopener noreferrer"
            title="Official website"
            className="text-gray-300 hover:text-un-blue"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5',
            active ? 'text-un-blue' : 'text-gray-300 group-hover:text-un-blue'
          )}
        />
      </div>
    </div>
  )
}
