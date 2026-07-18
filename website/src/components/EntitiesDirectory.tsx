'use client'

import { ChartSearchInput } from '@/components/ui/chart-search-input'
import { sectionLabel } from '@/components/table/BudgetStreamTree'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSectionFilter } from '@/hooks/use-section-filter'
import { BUDGET_STREAM_LABELS } from '@/lib/filter-constants'
import { cn } from '@/lib/utils'
import type { BudgetEntityNode, BudgetStream } from '@/types'
import { ChevronRight, MousePointerClick, Rows3, Tag } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

/**
 * The entity directory: every budget-holding entity, grouped by the budget
 * hierarchy (Programme Budget → Part → Section, Peacekeeping → Missions /
 * Support account). Reads the same `BudgetStream[]` as the table's budget
 * filter (getBudgetHierarchy). Two view toggles, persisted in localStorage:
 * compact (acronym pills) vs. full (cards with names), and whether to break
 * each part into its sections.
 *
 * On the single page, selecting an entity sets a single-facet view of the
 * mandates section and scrolls to it (see useSectionFilter); the active entity
 * is highlighted.
 */

interface EntitiesDirectoryProps {
  streams: BudgetStream[]
}

/**
 * Shared container for a compact grouping (a Programme Budget part, the
 * Peacekeeping stream, the Plan Outline): a faint UN-blue wash with a left
 * accent border, so each group reads as one bounded unit.
 */
const SECTION_BOX = 'border-l-4 border-un-blue bg-un-blue/10 px-4 py-3'

export function EntitiesDirectory({ streams }: EntitiesDirectoryProps) {
  const [search, setSearch] = useState('')
  const [compact, setCompact] = useState(true)
  const [showSections, setShowSections] = useState(false)
  const { active, select } = useSectionFilter('entity')
  const { active: activeDoc, select: selectDoc } =
    useSectionFilter('budget_document')

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
          <div className={cn(compact && SECTION_BOX, compact && 'h-full', 'space-y-1.5')}>
            <h3 className={showSections ? 'text-base' : 'text-sm'}>
              <span className="font-medium text-gray-500">
                Part {part.part}.
              </span>{' '}
              <span className="font-semibold text-gray-900">
                {part.part_title}
              </span>
            </h3>
            {showSections ? (
              part.sections.map((section) => (
                <div key={section.section} className="space-y-1.5">
                  <SubHeading>{sectionLabel(section)}</SubHeading>
                  <EntityGroup
                    entities={section.entities}
                    compact={compact}
                    active={active}
                    onSelect={select}
                  />
                </div>
              ))
            ) : (
              <EntityGroup
                entities={flat}
                compact={compact}
                active={active}
                onSelect={select}
              />
            )}
          </div>
        ),
      })
    }
  }

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
        <div className={cn(compact && SECTION_BOX)}>
          {showSections ? (
            <div className="space-y-3">
              {pkoGroups.map((group) => (
                <div key={group.group} className="space-y-1.5">
                  <SubHeading>{group.label}</SubHeading>
                  <EntityGroup
                    entities={group.entities}
                    compact={compact}
                    active={active}
                    onSelect={select}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EntityGroup
              entities={pkoGroups.flatMap((g) => g.entities)}
              compact={compact}
              active={active}
              onSelect={select}
            />
          )}
        </div>
      </div>
    ) : null

  // Plan Outline: a single facet card on the budget_document key.
  const planActive = activeDoc === 'plan_outline'
  const planNode =
    !term && planStream ? (
      <div>
        <div className="mb-3">
          <StreamHeading type="plan_outline" />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href="/secretariat?budget_document=plan_outline"
              onClick={(e) => {
                e.preventDefault()
                selectDoc('plan_outline')
              }}
              className={cn(
                'flex items-center gap-2 border-l-4 border-un-blue px-4 py-3 text-sm transition-colors',
                planActive
                  ? 'bg-un-blue/20'
                  : 'bg-un-blue/10 hover:bg-un-blue/20'
              )}
            >
              <span className="font-semibold">{planStream.label}</span>
              <span className="text-xs text-gray-500">
                {planStream.count} documents
              </span>
            </a>
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
          <ChartSearchInput
            placeholder="Search entities by acronym or name..."
            value={search}
            onChange={setSearch}
          />
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
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                    {ppbPartNodes.map((part) => (
                      <div key={part.key} className="h-full">
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
          <p className="text-sm text-gray-500">
            No entities match “{search.trim()}”.
          </p>
        )}

        {!term && (
          <p className="pt-2 text-xs text-gray-500">
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
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  )
}

function StreamHeading({ type }: { type: keyof typeof BUDGET_STREAM_LABELS }) {
  return (
    <h2 className="border-b border-gray-200 pb-1.5 text-xs font-semibold tracking-wide text-un-blue uppercase">
      {BUDGET_STREAM_LABELS[type]}
    </h2>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-500">{children}</p>
}

function EntityGroup({
  entities,
  compact,
  active,
  onSelect,
}: {
  entities: BudgetEntityNode[]
  compact: boolean
  active?: string
  onSelect: (value: string) => void
}) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {entities.map((entity) => (
          <EntityPill
            key={entity.entity}
            entity={entity}
            active={active === entity.entity}
            onSelect={onSelect}
          />
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {entities.map((entity) => (
        <EntityCard
          key={entity.entity}
          entity={entity}
          active={active === entity.entity}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

/** Wraps an entity anchor in the shared hover tooltip (full name + click hint). */
function EntityAnchor({
  entity,
  className,
  onSelect,
  children,
}: {
  entity: BudgetEntityNode
  className: string
  onSelect: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={`/secretariat?entity=${encodeURIComponent(entity.entity)}`}
          onClick={(e) => {
            e.preventDefault()
            onSelect(entity.entity)
          }}
          className={className}
        >
          {children}
        </a>
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

function EntityPill({
  entity,
  active,
  onSelect,
}: {
  entity: BudgetEntityNode
  active: boolean
  onSelect: (value: string) => void
}) {
  return (
    <EntityAnchor
      entity={entity}
      onSelect={onSelect}
      className={cn(
        'inline-flex items-baseline gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors',
        active
          ? 'border-un-blue bg-un-blue text-white'
          : 'border-gray-200 bg-white hover:border-un-blue hover:text-un-blue'
      )}
    >
      <span className="font-medium">{entity.entity}</span>
      <span
        className={cn('text-[10px]', active ? 'text-white/80' : 'text-gray-500')}
      >
        {entity.count}
      </span>
    </EntityAnchor>
  )
}

function EntityCard({
  entity,
  active,
  onSelect,
}: {
  entity: BudgetEntityNode
  active: boolean
  onSelect: (value: string) => void
}) {
  return (
    <EntityAnchor
      entity={entity}
      onSelect={onSelect}
      className={cn(
        'group flex items-start justify-between gap-2 rounded-lg border px-3 py-2 transition-colors',
        active
          ? 'border-un-blue bg-un-blue/5'
          : 'border-gray-200 bg-white hover:border-un-blue hover:shadow-sm'
      )}
    >
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold">{entity.entity}</span>
          <span className="text-[10px] text-gray-500">{entity.count}</span>
        </div>
        {entity.entity_long && (
          <div className="truncate text-xs text-gray-500">
            {entity.entity_long}
          </div>
        )}
      </div>
      <ChevronRight
        className={cn(
          'mt-0.5 h-3.5 w-3.5 shrink-0',
          active ? 'text-un-blue' : 'text-gray-300 group-hover:text-un-blue'
        )}
      />
    </EntityAnchor>
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
