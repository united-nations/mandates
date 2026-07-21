'use client'

import {
  ClickTooltip,
  DIRECTORY_GROUP_BOX,
  DirectoryToggle,
} from '@/components/DirectoryControls'
import { ChartSearchInput } from '@/components/ui/chart-search-input'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSectionFilter } from '@/hooks/use-section-filter'
import { cn } from '@/lib/utils'
import type { OrganGroup, OrganWithCount } from '@/types'
import { ChevronRight, ExternalLink, Tag } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

/**
 * The organ directory: every intergovernmental organ that adopts mandates,
 * grouped by its place in the UN system (see lib/organ-groups.ts). Reads the
 * same category structure the table's Organ filter groups by (getOrganHierarchy).
 *
 * On the single page, selecting an organ sets a single-facet view of the
 * mandates section and scrolls to it (see useSectionFilter); the active organ
 * is highlighted. Mirrors the entity directory: a compact view (acronym pills in
 * bounded group boxes) toggling to full cards with names, persisted in
 * localStorage.
 */

interface OrgansDirectoryProps {
  groups: OrganGroup[]
}

export function OrgansDirectory({ groups }: OrgansDirectoryProps) {
  const [search, setSearch] = useState('')
  const [compact, setCompact] = useState(true)
  const term = search.trim().toLowerCase()
  const { active, select } = useSectionFilter('organ')

  // Restore the saved preference after mount (avoids an SSR hydration mismatch).
  useEffect(() => {
    const c = localStorage.getItem('organs.compact')
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of a persisted UI pref */
    if (c !== null) setCompact(c === '1')
  }, [])
  useEffect(() => {
    localStorage.setItem('organs.compact', compact ? '1' : '0')
  }, [compact])

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
        <div className="flex flex-wrap items-center gap-3">
          <ChartSearchInput
            placeholder="Search organs by acronym or name..."
            value={search}
            onChange={setSearch}
          />
          <DirectoryToggle
            active={compact}
            onClick={() => setCompact((v) => !v)}
            icon={Tag}
          >
            Compact
          </DirectoryToggle>
        </div>

        {filtered.length > 0 ? (
          compact ? (
            <div className="columns-1 gap-x-8 sm:columns-2">
              {filtered.map((group) => (
                <div key={group.id} className="mb-5 break-inside-avoid">
                  <div className={cn(DIRECTORY_GROUP_BOX, 'space-y-1.5')}>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {group.label}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {group.organs.map((organ) => (
                        <OrganPill
                          key={organ.short}
                          organ={organ}
                          active={active === organ.short}
                          onSelect={select}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {filtered.map((group) => (
                <div key={group.id}>
                  <div className="mb-3">
                    <GroupHeading>{group.label}</GroupHeading>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
          )
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
    <h2 className="border-b border-gray-200 pb-1.5 text-xs font-semibold tracking-wide text-un-blue uppercase">
      {children}
    </h2>
  )
}

/** Acronym + citation count: the compact counterpart of OrganCard. */
function OrganPill({
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
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={`/secretariat?organ=${encodeURIComponent(organ.short)}`}
          onClick={(e) => {
            e.preventDefault()
            onSelect(organ.short)
          }}
          className={cn(
            'inline-flex items-baseline gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors',
            active
              ? 'border-un-blue bg-un-blue text-white'
              : 'border-gray-200 bg-white hover:border-un-blue hover:text-un-blue'
          )}
        >
          <span className="font-medium">{organ.short}</span>
          <span
            className={cn(
              'text-[10px]',
              active ? 'text-white/80' : 'text-gray-500'
            )}
          >
            {organ.count}
          </span>
        </a>
      </TooltipTrigger>
      <ClickTooltip name={hasLong ? organ.long : undefined} />
    </Tooltip>
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
        'group flex items-start justify-between gap-2 rounded-lg border px-3 py-2 transition-colors',
        active
          ? 'border-un-blue bg-un-blue/5'
          : 'border-gray-200 bg-white hover:border-un-blue hover:shadow-sm'
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
            className="min-w-0 flex-1"
          >
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold">{organ.short}</span>
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
