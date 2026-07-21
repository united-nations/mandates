'use client'

import {
  ClickTooltip,
  DIRECTORY_GROUP_BOX,
  DirectoryToggle,
} from '@/components/DirectoryControls'
import { ChartSearchInput } from '@/components/ui/chart-search-input'
import { sectionLabel } from '@/components/table/BudgetStreamTree'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSectionFilter } from '@/hooks/use-section-filter'
import { BUDGET_STREAM_LABELS } from '@/lib/filter-constants'
import { cn } from '@/lib/utils'
import type { BudgetEntityNode, BudgetStream } from '@/types'
import { ChevronRight, Rows3, Tag } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

/**
 * The entity directory: every budget-holding entity, grouped by the budget
 * hierarchy (Programme Budget → Part → Section, Peacekeeping → Missions /
 * Support account). Reads the same `BudgetStream[]` as the table's budget
 * filter (getBudgetHierarchy). Two view toggles, persisted in localStorage:
 * compact (acronym pills) vs. full (cards with names), and whether to break
 * each part into its sections.
 *
 * On the single page, selecting an entity — or a part / section heading — sets
 * a single-facet view of the mandates section and scrolls to it (see
 * useSectionFilter); the active node is highlighted.
 */

interface EntitiesDirectoryProps {
  streams: BudgetStream[]
}

export function EntitiesDirectory({ streams }: EntitiesDirectoryProps) {
  const [search, setSearch] = useState('')
  const [compact, setCompact] = useState(true)
  const [showSections, setShowSections] = useState(false)
  const { active, select } = useSectionFilter('entity')
  const { active: activeDoc, select: selectDoc } =
    useSectionFilter('budget_document')
  const { active: activePart, select: selectPart } =
    useSectionFilter('budget_part')
  const { active: activeSection, select: selectSection } =
    useSectionFilter('section')

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
      const partActive = activePart === part.part
      ppbPartNodes.push({
        key: `part-${part.part}`,
        node: (
          <div className={cn(compact && DIRECTORY_GROUP_BOX, 'space-y-1.5')}>
            <h3 className={showSections ? 'text-base' : 'text-sm'}>
              <FilterHeading
                href={`/secretariat?budget_part=${encodeURIComponent(part.part)}`}
                active={partActive}
                onSelect={() => selectPart(part.part)}
              >
                <span
                  className={cn(
                    'font-medium',
                    partActive ? 'text-un-blue' : 'text-gray-500'
                  )}
                >
                  Part {part.part}.
                </span>{' '}
                <span
                  className={cn(
                    'font-semibold',
                    partActive ? 'text-un-blue' : 'text-gray-900'
                  )}
                >
                  {part.part_title}
                </span>
              </FilterHeading>
            </h3>
            {showSections ? (
              part.sections.map((section) => (
                <div key={section.section} className="space-y-1.5">
                  <SubHeading active={activeSection === section.section}>
                    <FilterHeading
                      href={`/secretariat?section=${encodeURIComponent(section.section)}`}
                      active={activeSection === section.section}
                      onSelect={() => selectSection(section.section)}
                    >
                      {sectionLabel(section)}
                    </FilterHeading>
                  </SubHeading>
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
  // Missions and the Support account are the Peacekeeping stream's top-level
  // split — its analogue to the Programme Budget's parts (there is no section
  // level below). So they always show as their own boxes, quieter than a PPB
  // part (no "Part N." number) and not gated behind the section toggle.
  const pkoNode =
    pkoGroups.length > 0 ? (
      <div>
        <div className="mb-3">
          <StreamHeading type="pko" />
        </div>
        <div className="space-y-5">
          {pkoGroups.map((group) =>
            compact ? (
              <div
                key={group.group}
                className={cn(DIRECTORY_GROUP_BOX, 'space-y-1.5')}
              >
                <h3 className="text-sm font-semibold text-gray-900">
                  {group.label}
                </h3>
                <EntityGroup
                  entities={group.entities}
                  compact={compact}
                  active={active}
                  onSelect={select}
                />
              </div>
            ) : (
              <div key={group.group} className="space-y-1.5">
                <SubHeading>{group.label}</SubHeading>
                <EntityGroup
                  entities={group.entities}
                  compact={compact}
                  active={active}
                  onSelect={select}
                />
              </div>
            )
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
          <DirectoryToggle
            active={showSections}
            onClick={() => setShowSections((v) => !v)}
            icon={Rows3}
          >
            View sections and programmes
          </DirectoryToggle>
          <DirectoryToggle
            active={compact}
            onClick={() => setCompact((v) => !v)}
            icon={Tag}
          >
            Compact
          </DirectoryToggle>
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
                      <div key={part.key} className="mb-5 break-inside-avoid">
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

/**
 * A heading that doubles as a filter (budget part, section/programme).
 * Deliberately not pill-styled — the hierarchy has to keep reading as headings,
 * so the affordance is an underline and the active one is underlined in UN blue.
 */
function FilterHeading({
  href,
  active,
  onSelect,
  children,
}: {
  href: string
  active: boolean
  onSelect: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={href}
          onClick={(e) => {
            e.preventDefault()
            onSelect()
          }}
          className={cn(
            'underline-offset-4 hover:underline hover:decoration-un-blue',
            active && 'underline decoration-un-blue decoration-2'
          )}
        >
          {children}
        </a>
      </TooltipTrigger>
      <ClickTooltip />
    </Tooltip>
  )
}

function StreamHeading({ type }: { type: keyof typeof BUDGET_STREAM_LABELS }) {
  return (
    <h2 className="border-b border-gray-200 pb-1.5 text-xs font-semibold tracking-wide text-un-blue uppercase">
      {BUDGET_STREAM_LABELS[type]}
    </h2>
  )
}

function SubHeading({
  active = false,
  children,
}: {
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <p className={cn('text-sm', active ? 'text-un-blue' : 'text-gray-500')}>
      {children}
    </p>
  )
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

/**
 * Wraps an entity anchor in the shared hover tooltip: full name, the entity's
 * subprogrammes as pills, and the click hint.
 */
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
      <ClickTooltip
        name={entity.entity_long}
        pills={entity.subprogrammes.map((sp) => sp.subprogramme)}
      />
    </Tooltip>
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
        className={cn(
          'text-[10px]',
          active ? 'text-white/80' : 'text-gray-500'
        )}
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
