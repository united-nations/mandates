'use client'

import { SearchInput } from '@/components/SearchInput'
import { sectionLabel } from '@/components/table/BudgetStreamTree'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { BUDGET_STREAM_LABELS } from '@/lib/filter-constants'
import { cn } from '@/lib/utils'
import type { BudgetEntityNode, BudgetStream } from '@/types'
import { ChevronRight, MousePointerClick, Rows3, Tag } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

/**
 * The entity directory: every budget-holding entity, grouped by the budget
 * hierarchy (Programme Budget → Part → Section, Peacekeeping → Missions /
 * Support account). Reads the same `BudgetStream[]` as the table's budget
 * filter (getBudgetHierarchy). Two view toggles, persisted in localStorage:
 * compact (acronym pills) vs. full (cards with names), and whether to break
 * each part into its sections. Every entity links to the main list filtered to
 * it; hovering shows the full name and a "click to show mandates" hint.
 *
 * Compact view lays each stream out as its own region: Programme Budget under a
 * full-width heading with its parts balanced across two CSS columns (parts stay
 * whole via break-inside-avoid), then Peacekeeping and the Plan Outline below in
 * fixed side-by-side columns. Because the Programme Budget heading spans both
 * columns, no per-column "(continued)" label is needed wherever the flow breaks.
 * Full view stacks every stream in one column.
 */

interface EntitiesDirectoryProps {
  streams: BudgetStream[]
}

export function EntitiesDirectory({ streams }: EntitiesDirectoryProps) {
  const [search, setSearch] = useState('')
  const [compact, setCompact] = useState(true)
  const [showSections, setShowSections] = useState(false)

  // Restore saved preferences after mount (avoids an SSR hydration mismatch).
  useEffect(() => {
    const c = localStorage.getItem('entities.compact')
    const s = localStorage.getItem('entities.showSections')
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore of persisted UI prefs */
    if (c !== null) setCompact(c === '1')
    if (s !== null) setShowSections(s === '1')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])
  useEffect(() => {
    localStorage.setItem('entities.compact', compact ? '1' : '0')
  }, [compact])
  useEffect(() => {
    localStorage.setItem('entities.showSections', showSections ? '1' : '0')
  }, [showSections])

  const term = search.trim().toLowerCase()
  const match = (entity: BudgetEntityNode) =>
    !term ||
    entity.entity.toLowerCase().includes(term) ||
    (entity.entity_long?.toLowerCase().includes(term) ?? false)

  const totalEntities = useMemo(() => countEntities(streams), [streams])

  // Each stream renders as its own region rather than one flowing block list.
  // Programme Budget gets a full-width heading above an auto-balanced two-column
  // flow of its parts — the wide heading governs both columns, so no per-column
  // "(continued)" label is ever needed regardless of where the browser breaks.
  // Peacekeeping and the Plan Outline are small independent tails: they sit
  // below in fixed side-by-side columns (no balancing across the boundary).
  const ppbStream = streams.find(
    (s): s is Extract<BudgetStream, { type: 'ppb' }> => s.type === 'ppb'
  )
  const pkoStream = streams.find(
    (s): s is Extract<BudgetStream, { type: 'pko' }> => s.type === 'pko'
  )
  const planStream = streams.find(
    (s): s is Extract<BudgetStream, { type: 'plan_outline' }> =>
      s.type === 'plan_outline'
  )

  // Programme Budget: one node per part (its heading + entities), filtered.
  const ppbPartNodes: { key: string; node: React.ReactNode }[] = []
  if (ppbStream) {
    const parts = ppbStream.parts
      .map((part) => ({
        ...part,
        sections: part.sections
          .map((s) => ({ ...s, entities: s.entities.filter(match) }))
          .filter((s) => s.entities.length > 0),
      }))
      .filter((p) => p.sections.length > 0)
    for (const part of parts) {
      const flat = part.sections.flatMap((s) => s.entities)
      ppbPartNodes.push({
        key: `part-${part.part}`,
        node: (
          <div className="space-y-1.5">
            <h3 className={showSections ? 'text-base' : 'text-sm'}>
              <span className="font-medium text-muted-foreground">
                Part {part.part}.
              </span>{' '}
              <span className="font-semibold text-foreground">
                {part.part_title}
              </span>
            </h3>
            {showSections ? (
              part.sections.map((section) => (
                <div key={section.section} className="space-y-1.5">
                  <SubHeading>{sectionLabel(section)}</SubHeading>
                  <EntityGroup entities={section.entities} compact={compact} />
                </div>
              ))
            ) : (
              <EntityGroup entities={flat} compact={compact} />
            )}
          </div>
        ),
      })
    }
  }

  // Peacekeeping: heading + groups (optionally broken into missions/support).
  const pkoGroups = pkoStream
    ? pkoStream.groups
        .map((g) => ({ ...g, entities: g.entities.filter(match) }))
        .filter((g) => g.entities.length > 0)
    : []
  const pkoNode =
    pkoGroups.length > 0 ? (
      <div>
        <div className="mb-3">
          <StreamHeading type="pko" />
        </div>
        {showSections ? (
          <div className="space-y-3">
            {pkoGroups.map((group) => (
              <div key={group.group} className="space-y-1.5">
                <SubHeading>{group.label}</SubHeading>
                <EntityGroup entities={group.entities} compact={compact} />
              </div>
            ))}
          </div>
        ) : (
          <EntityGroup
            entities={pkoGroups.flatMap((g) => g.entities)}
            compact={compact}
          />
        )}
      </div>
    ) : null

  // Plan Outline: a single link card. Hidden while searching (nothing to match).
  const planNode =
    !term && planStream ? (
      <div>
        <div className="mb-3">
          <StreamHeading type="plan_outline" />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/secretariat?budget_document=plan_outline"
              className="inline-flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              <span className="font-semibold">{planStream.label}</span>
              <span className="text-xs text-muted-foreground">
                {planStream.count} documents
              </span>
            </Link>
          </TooltipTrigger>
          <ClickTooltip />
        </Tooltip>
      </div>
    ) : null

  const hasAnyRegion =
    ppbPartNodes.length > 0 || pkoNode !== null || planNode !== null

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="max-w-md min-w-48 flex-1">
            <SearchInput
              placeholder="Search entities by acronym or name..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              variant="border-bottom"
            />
          </div>
          <Toggle
            active={showSections}
            onClick={() => setShowSections((v) => !v)}
            icon={Rows3}
          >
            View sections
          </Toggle>
          <Toggle
            active={compact}
            onClick={() => setCompact((v) => !v)}
            icon={Tag}
          >
            Compact
          </Toggle>
        </div>

        {hasAnyRegion && (
          <div className="space-y-8">
            {ppbPartNodes.length > 0 && (
              <div>
                <div className="mb-3">
                  <StreamHeading type="ppb" />
                </div>
                {compact ? (
                  <div className="columns-2 gap-x-8">
                    {ppbPartNodes.map((part) => (
                      <div
                        key={part.key}
                        className="mb-5 break-inside-avoid"
                      >
                        {part.node}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {ppbPartNodes.map((part) => (
                      <div key={part.key}>{part.node}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(pkoNode || planNode) &&
              (compact ? (
                <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2">
                  {pkoNode}
                  {planNode}
                </div>
              ) : (
                <div className="space-y-8">
                  {pkoNode}
                  {planNode}
                </div>
              ))}
          </div>
        )}

        {term && countMatches(streams, match) === 0 && (
          <p className="text-sm text-muted-foreground">
            No entities match “{search.trim()}”.
          </p>
        )}

        {!term && (
          <p className="pt-2 text-xs text-muted-foreground">
            {totalEntities} entities across the budget.
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
  icon: typeof Rows3
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

function StreamHeading({ type }: { type: keyof typeof BUDGET_STREAM_LABELS }) {
  return (
    <h2 className="border-b border-border pb-1.5 text-xs font-semibold tracking-wide text-un-blue uppercase">
      {BUDGET_STREAM_LABELS[type]}
    </h2>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

function EntityGroup({
  entities,
  compact,
}: {
  entities: BudgetEntityNode[]
  compact: boolean
}) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {entities.map((entity) => (
          <EntityPill key={entity.entity} entity={entity} />
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {entities.map((entity) => (
        <EntityCard key={entity.entity} entity={entity} />
      ))}
    </div>
  )
}

/** Wraps an entity link in the shared hover tooltip (full name + click hint). */
function EntityLink({
  entity,
  className,
  children,
}: {
  entity: BudgetEntityNode
  className: string
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={`/secretariat?entity=${encodeURIComponent(entity.entity)}`}
          className={className}
        >
          {children}
        </Link>
      </TooltipTrigger>
      <ClickTooltip name={entity.entity_long} />
    </Tooltip>
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

function EntityPill({ entity }: { entity: BudgetEntityNode }) {
  return (
    <EntityLink
      entity={entity}
      className="inline-flex items-baseline gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs transition-colors hover:bg-accent"
    >
      <span className="font-medium">{entity.entity}</span>
      <span className="text-[10px] text-muted-foreground">{entity.count}</span>
    </EntityLink>
  )
}

function EntityCard({ entity }: { entity: BudgetEntityNode }) {
  return (
    <EntityLink
      entity={entity}
      className="group flex items-start justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2 transition-colors hover:bg-muted"
    >
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold">{entity.entity}</span>
          <span className="text-[10px] text-muted-foreground">
            {entity.count}
          </span>
        </div>
        {entity.entity_long && (
          <div className="truncate text-xs text-muted-foreground">
            {entity.entity_long}
          </div>
        )}
      </div>
      <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-un-blue" />
    </EntityLink>
  )
}

function countEntities(streams: BudgetStream[]): number {
  const seen = new Set<string>()
  for (const stream of streams) {
    if (stream.type === 'ppb') {
      for (const part of stream.parts)
        for (const section of part.sections)
          for (const e of section.entities) seen.add(e.entity)
    } else if (stream.type === 'pko') {
      for (const group of stream.groups)
        for (const e of group.entities) seen.add(e.entity)
    }
  }
  return seen.size
}

function countMatches(
  streams: BudgetStream[],
  match: (e: BudgetEntityNode) => boolean
): number {
  let n = 0
  for (const stream of streams) {
    if (stream.type === 'ppb') {
      for (const part of stream.parts)
        for (const section of part.sections)
          n += section.entities.filter(match).length
    } else if (stream.type === 'pko') {
      for (const group of stream.groups)
        n += group.entities.filter(match).length
    }
  }
  return n
}
