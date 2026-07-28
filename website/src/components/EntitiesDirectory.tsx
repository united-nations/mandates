'use client'

import { ClickTooltip, DirectoryToggle } from '@/components/DirectoryControls'
import { ChartSearchInput } from '@/components/ui/chart-search-input'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSectionFilter } from '@/hooks/use-section-filter'
import { cn } from '@/lib/utils'
import type { BudgetEntityNode, BudgetStream } from '@/types'
import { ChevronRight, Layers, Tag } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

/**
 * The entity directory: every budget-holding entity that implements mandates,
 * in three flat groups — Secretariat, Special Political Missions, Peacekeeping
 * Operations. Reads the same `BudgetStream[]` as the table's budget filter
 * (getBudgetHierarchy).
 *
 * The three groups are derived from the data on every render, never hardcoded:
 * the split is version-dependent (PPB 2026 has 38 special political missions,
 * PPB 2027 has 36), so a fixed entity list would silently rot.
 *   Peacekeeping Operations — the `pko` stream (peacekeeping financing reports).
 *   Special Political Missions — `ppb` entities budgeted in a section-3 addendum
 *     ("3 (Add.2)" … "3 (Add.6)"); see sql/migrations/033_import_ppb2027_spm.sql.
 *     The bare "Add.N" sections are peacekeeping fascicles, never section 3, so
 *     the prefix test cannot collide.
 *   Secretariat — every remaining `ppb` entity.
 * Known edge: UNSCO, UNOAU and UNRoD are mission-like but are budgeted in the
 * section-3 fascicle proper rather than an addendum, so they read as
 * Secretariat. That is what the budget documents actually say.
 *
 * The Programme Budget's part/section hierarchy and the Plan Outline are
 * deliberately absent — this modal answers "who implements mandates", not
 * "where in the budget document does it sit" (the table's budget filter still
 * does the latter). The Plan Outline contributes no entities at all: its
 * citations carry entity IS NULL.
 *
 * The group headings are plain text on purpose: no filter parameter expresses
 * "Secretariat" or "Special Political Missions", so making them look clickable
 * would promise a filter that does not exist.
 *
 * On the single page, selecting an entity sets a single-facet view of the
 * mandates section and scrolls to it (see useSectionFilter); the active node is
 * highlighted. One view toggle, persisted in localStorage: compact (acronym
 * pills, the default) vs. full cards with names.
 */

interface EntitiesDirectoryProps {
  streams: BudgetStream[]
}

interface EntityBucket {
  id: 'secretariat' | 'spm' | 'pko'
  label: string
  entities: BudgetEntityNode[]
}

/** A Programme Budget section that is a special-political-mission addendum. */
const isSpmSection = (section: string) => section.startsWith('3 (Add.')

const byCountThenName = (a: BudgetEntityNode, b: BudgetEntityNode) =>
  b.count - a.count || a.entity.localeCompare(b.entity)

export function EntitiesDirectory({ streams }: EntitiesDirectoryProps) {
  const [search, setSearch] = useState('')
  const [compact, setCompact] = useState(true)
  const { active, select } = useSectionFilter('entity')

  // Restore the saved preference after mount (avoids an SSR hydration mismatch).
  useEffect(() => {
    const c = localStorage.getItem('entities.compact')
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of a persisted UI pref */
    if (c !== null) setCompact(c === '1')
  }, [])
  useEffect(() => {
    localStorage.setItem('entities.compact', compact ? '1' : '0')
  }, [compact])

  const buckets = useMemo<EntityBucket[]>(
    () => buildBuckets(streams),
    [streams]
  )

  const term = search.trim().toLowerCase()
  const match = (entity: BudgetEntityNode) =>
    !term ||
    entity.entity.toLowerCase().includes(term) ||
    (entity.entity_long?.toLowerCase().includes(term) ?? false)

  const totalEntities = buckets.reduce((n, b) => n + b.entities.length, 0)
  const visible = buckets
    .map((b) => ({ ...b, entities: b.entities.filter(match) }))
    .filter((b) => b.entities.length > 0)

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
            active={compact}
            onClick={() => setCompact((v) => !v)}
            icon={Tag}
          >
            Compact
          </DirectoryToggle>
        </div>

        {visible.length > 0 ? (
          <div className="space-y-6">
            {visible.map((bucket) => (
              <div key={bucket.id}>
                <GroupHeading count={bucket.entities.length}>
                  {bucket.label}
                </GroupHeading>
                <div className="mt-3">
                  <EntityGroup
                    entities={bucket.entities}
                    compact={compact}
                    active={active}
                    onSelect={select}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No entities match “{search.trim()}”.
          </p>
        )}

        {!term && (
          <p className="pt-2 text-xs text-gray-500">
            {totalEntities.toLocaleString()} entities across the budget.
          </p>
        )}
      </div>
    </TooltipProvider>
  )
}

/**
 * Fold the budget streams into the three flat groups. Deliberately defensive:
 * an entity is only ever placed once (the special-political-mission reading wins
 * over the plain Secretariat one), even though the three buckets are disjoint in
 * the data today.
 */
function buildBuckets(streams: BudgetStream[]): EntityBucket[] {
  const pko: BudgetEntityNode[] = []
  const spm: BudgetEntityNode[] = []
  const secretariat: BudgetEntityNode[] = []
  const seen = new Set<string>()
  const push = (into: BudgetEntityNode[], entity: BudgetEntityNode) => {
    if (seen.has(entity.entity)) return
    seen.add(entity.entity)
    into.push(entity)
  }

  for (const stream of streams) {
    if (stream.type !== 'pko') continue
    for (const group of stream.groups)
      for (const entity of group.entities) push(pko, entity)
  }

  const ppb = streams.find(
    (s): s is Extract<BudgetStream, { type: 'ppb' }> => s.type === 'ppb'
  )
  if (ppb) {
    const sections = ppb.parts.flatMap((part) => part.sections)
    for (const section of sections)
      if (isSpmSection(section.section))
        for (const entity of section.entities) push(spm, entity)
    for (const section of sections)
      if (!isSpmSection(section.section))
        for (const entity of section.entities) push(secretariat, entity)
  }

  const all: EntityBucket[] = [
    {
      id: 'secretariat',
      label: 'Secretariat',
      entities: secretariat.sort(byCountThenName),
    },
    {
      id: 'spm',
      label: 'Special Political Missions',
      entities: spm.sort(byCountThenName),
    },
    {
      id: 'pko',
      label: 'Peacekeeping Operations',
      entities: pko.sort(byCountThenName),
    },
  ]
  return all.filter((b) => b.entities.length > 0)
}

/**
 * Plain heading — not a filter; see the component doc comment. h3, not h2: the
 * dialog's own DialogTitle is the h2 of this subtree.
 */
function GroupHeading({
  count,
  children,
}: {
  count: number
  children: React.ReactNode
}) {
  return (
    <h3 className="flex items-baseline gap-2 border-b border-gray-200 pb-1.5 text-sm font-normal tracking-wide text-gray-600 uppercase">
      {children}
      <span className="text-xs text-gray-500 tabular-nums">
        {count.toLocaleString()}
      </span>
    </h3>
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
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
 * subprogrammes as their own filter pills, and the click hint.
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
  // Read here rather than threading two more props through EntityGroup: the
  // hook is just filter context, and only this component needs it.
  const { active: activeSub, select: selectSub } =
    useSectionFilter('subprogramme')

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
        meta={entityMeta(entity)}
        pills={entity.subprogrammes.map((sp) => ({
          label: sp.subprogramme,
          value: sp.subprogramme,
        }))}
        onPillSelect={selectSub}
        activePill={activeSub}
      />
    </Tooltip>
  )
}

/** Spells out the card's two bare numbers for the hover tooltip. */
function entityMeta(entity: BudgetEntityNode): string {
  const parts = [
    `${entity.count.toLocaleString()} mandate${entity.count === 1 ? '' : 's'}`,
  ]
  const subs = entity.subprogrammes.length
  if (subs > 0)
    parts.push(`${subs.toLocaleString()} subprogramme${subs === 1 ? '' : 's'}`)
  return parts.join(' · ')
}

/**
 * How many subprogrammes an entity has, shown only when there are any: 70 of the
 * 94 Programme Budget entities have none (the generic "All Subprogrammes" bucket
 * is nulled out upstream), so an always-on badge would read "0" on most of them.
 *
 * The layers glyph is load-bearing, not decoration: without it the pill reads
 * "OHCHR 433 4" — two unlabelled numbers that run together into "4334" at
 * mobile widths. Icon + number is visibly a different kind of quantity from the
 * bare mandate count, and the tooltip (see entityMeta) names both.
 */
function SubprogrammeBadge({
  count,
  active,
}: {
  count: number
  active: boolean
}) {
  if (count <= 0) return null
  const label = `${count} subprogramme${count === 1 ? '' : 's'}`
  return (
    <span
      title={label}
      className={cn(
        'ml-0.5 inline-flex shrink-0 items-center gap-0.5 self-center rounded-full px-1 py-px text-[9px] leading-none font-medium tabular-nums',
        active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
      )}
    >
      <Layers aria-hidden className="size-2.5" />
      {count.toLocaleString()}
      <span className="sr-only">{label}</span>
    </span>
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
        'inline-flex items-baseline gap-1.5 rounded-full border py-0.5 pr-1.5 pl-2.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none',
        active
          ? 'border-un-blue bg-un-blue text-white'
          : 'border-gray-200 bg-white hover:border-un-blue hover:text-un-blue'
      )}
    >
      <span className="font-medium">{entity.entity}</span>
      <span
        title={`${entity.count.toLocaleString()} mandate${entity.count === 1 ? '' : 's'}`}
        className={cn(
          'text-[10px] tabular-nums',
          active ? 'text-white/80' : 'text-gray-500'
        )}
      >
        {entity.count.toLocaleString()}
      </span>
      <SubprogrammeBadge count={entity.subprogrammes.length} active={active} />
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
        'group flex items-start justify-between gap-2 rounded-lg border bg-white px-3 py-2 transition-all focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none',
        active
          ? 'border-un-blue'
          : 'border-gray-200 hover:border-un-blue hover:shadow-md'
      )}
    >
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              'text-sm font-semibold',
              active ? 'text-un-blue' : 'text-gray-900'
            )}
          >
            {entity.entity}
          </span>
          <span
            title={`${entity.count.toLocaleString()} mandate${entity.count === 1 ? '' : 's'}`}
            className="text-[10px] text-gray-500 tabular-nums"
          >
            {entity.count.toLocaleString()}
          </span>
          <SubprogrammeBadge
            count={entity.subprogrammes.length}
            active={false}
          />
        </div>
        {entity.entity_long && (
          // Multi-line rather than one truncated line — see OrgansDirectory;
          // `title` is the recovery path should a name still clamp.
          <div
            title={entity.entity_long}
            className="line-clamp-3 text-xs leading-snug text-gray-500"
          >
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
