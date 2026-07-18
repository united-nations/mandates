'use client'

import { SearchInput } from '@/components/SearchInput'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { OrganGroup, OrganWithCount } from '@/types'
import {
  ChevronRight,
  ExternalLink,
  MousePointerClick,
  Tag,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

/**
 * The organ directory: every intergovernmental organ that adopts mandates,
 * grouped by its place in the UN system (see lib/organ-groups.ts). Reads the
 * same category structure the table's Organ filter groups by (getOrganHierarchy).
 *
 * Deliberately simpler than the entity directory: organs are a small fixed set,
 * so there is no section toggle and no two-column flow — just category headings
 * over the organs. One view toggle, persisted in localStorage: full (cards with
 * names + official-site links) vs. compact (acronym pills). Each organ links to
 * the main list filtered to it; hovering shows a "click to show mandates" hint.
 */

interface OrgansDirectoryProps {
  groups: OrganGroup[]
}

export function OrgansDirectory({ groups }: OrgansDirectoryProps) {
  const [search, setSearch] = useState('')
  const [compact, setCompact] = useState(false)
  const term = search.trim().toLowerCase()

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
          <div className="max-w-md min-w-48 flex-1">
            <SearchInput
              placeholder="Search organs by acronym or name..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              variant="border-bottom"
            />
          </div>
          <Toggle
            active={compact}
            onClick={() => setCompact((v) => !v)}
            icon={Tag}
          >
            Compact
          </Toggle>
        </div>

        {filtered.length > 0 ? (
          <div className="space-y-8">
            {filtered.map((group) => (
              <div key={group.id}>
                <div className="mb-3">
                  <GroupHeading>{group.label}</GroupHeading>
                </div>
                <OrganGroup organs={group.organs} compact={compact} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No organs match “{search.trim()}”.
          </p>
        )}

        {!term && (
          <p className="pt-2 text-xs text-muted-foreground">
            {totalOrgans} organs adopting mandates.
          </p>
        )}
      </div>
    </TooltipProvider>
  )
}

function Toggle({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Tag
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'bg-un-blue text-white hover:bg-un-blue/90'
          : 'bg-muted text-muted-foreground hover:bg-accent'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  )
}

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-border pb-1.5 text-xs font-semibold tracking-wide text-un-blue uppercase">
      {children}
    </h2>
  )
}

function OrganGroup({
  organs,
  compact,
}: {
  organs: OrganWithCount[]
  compact: boolean
}) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {organs.map((organ) => (
          <OrganPill key={organ.short} organ={organ} />
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {organs.map((organ) => (
        <OrganCard key={organ.short} organ={organ} />
      ))}
    </div>
  )
}

function OrganPill({ organ }: { organ: OrganWithCount }) {
  const hasLong = organ.long && organ.long !== organ.short
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={`/secretariat?organ=${encodeURIComponent(organ.short)}`}
          className="inline-flex items-baseline gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs transition-colors hover:bg-accent"
        >
          <span className="font-medium">{organ.short}</span>
          <span className="text-[10px] text-muted-foreground">
            {organ.count}
          </span>
        </Link>
      </TooltipTrigger>
      <ClickTooltip name={hasLong ? organ.long : undefined} />
    </Tooltip>
  )
}

function OrganCard({ organ }: { organ: OrganWithCount }) {
  const hasLong = organ.long && organ.long !== organ.short

  return (
    <div className="group flex items-start justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2 transition-colors hover:bg-muted">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={`/secretariat?organ=${encodeURIComponent(organ.short)}`}
            className="min-w-0 flex-1"
          >
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold">{organ.short}</span>
              <span className="text-[10px] text-muted-foreground">
                {organ.count}
              </span>
            </div>
            {hasLong && (
              <div className="text-xs leading-snug text-muted-foreground">
                {organ.long}
              </div>
            )}
          </Link>
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
            className="text-muted-foreground/40 hover:text-un-blue"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-un-blue" />
      </div>
    </div>
  )
}

function ClickTooltip({ name }: { name?: string | null }) {
  return (
    <TooltipContent side="top" className="max-w-xs">
      {name && <div className="font-medium">{name}</div>}
      <div className="mt-0.5 flex items-center gap-1 text-un-blue">
        <MousePointerClick className="h-3.5 w-3.5" />
        Click to show mandates
      </div>
    </TooltipContent>
  )
}
