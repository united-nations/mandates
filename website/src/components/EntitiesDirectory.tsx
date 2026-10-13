'use client'

import { ClickTooltip, DirectoryToggle } from '@/components/DirectoryControls'
import { ChartSearchInput } from '@/components/ui/chart-search-input'
import { Chip, ChipCount } from '@/components/ui/chip'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type {
  BudgetEntityNode,
  BudgetStream,
  DirectorySelection,
} from '@/types'
import { ChevronRight, LayoutGrid, Tag } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

/**
 * The entity directory: every budget-holding entity that cited a mandate in
 * its budget submission, in three flat groups — Secretariat, Special Political
 * Missions, Peacekeeping Operations. Reads the same `BudgetStream[]` as the
 * table's budget filter (getBudgetHierarchy).
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
 * deliberately absent — this modal answers "who cited a mandate", not
 * "where in the budget document does it sit" (the table's budget filter still
 * does the latter). The Plan Outline contributes no entities at all: its
 * citations carry entity IS NULL.
 *
 * The group headings are plain text on purpose: no filter parameter expresses
 * "Secretariat" or "Special Political Missions", so making them look clickable
 * would promise a filter that does not exist.
 *
 * On the single page, selecting an entity ADDS it to the active filters (while
 * clearing any other budget location, which is the same dimension) and scrolls
 * to the mandates section; the active node is highlighted. The write is injected
 * by DirectoryExplorer (see DirectorySelection) so it matches the scope these
 * counts were computed under. One view toggle, persisted for the browser
 * session: compact (acronym pills, the default) vs. full cards with names.
 */

interface EntitiesDirectoryProps {
  streams: BudgetStream[]
  selection: DirectorySelection
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

export function EntitiesDirectory({
  streams,
  selection,
}: EntitiesDirectoryProps) {
  const [search, setSearch] = useState('')
  const [compact, setCompact] = useState(true)
  const active = selection.active('entity')
  const select = (value: string) => selection.select('entity', value)

  // Session storage, not local: switching to Full is a "let me look at this
  // one thing" move, and carrying it across browser sessions meant the panel
  // opened in a view nobody had chosen that day. The toggle is still sticky
  // while you are working - reopen the panel, get the view you left - and a
  // new browser session opens compact again.
  //
  // Restore the saved preference after mount (avoids an SSR hydration mismatch).
  useEffect(() => {
    const c = sessionStorage.getItem('entities.compact')
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of a persisted UI pref */
    if (c !== null) setCompact(c === '1')
  }, [])
  useEffect(() => {
    sessionStorage.setItem('entities.compact', compact ? '1' : '0')
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
            label="Entity view"
            value={compact ? 'compact' : 'full'}
            onChange={(value) => setCompact(value === 'compact')}
            options={[
              { value: 'compact', label: 'Compact', icon: Tag },
              { value: 'full', label: 'Full', icon: LayoutGrid },
            ]}
          />
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
          <p className="text-sm text-muted-foreground">
            No entities match “{search.trim()}”.
          </p>
        )}

        {!term && (
          <p className="pt-2 text-sm text-muted-foreground">
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
    <h3 className="flex items-baseline gap-2 border-b border-border pb-1.5 text-sm font-normal tracking-wide text-muted-foreground uppercase">
      {children}
      <span className="text-sm text-muted-foreground tabular-nums">
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
 * Wraps an entity node in the shared hover tooltip: full name, a legend for the
 * bare number on the pill, and the click hint.
 *
 * `render` rather than a fixed anchor, because the two views are different
 * elements: the compact view is a `Chip` (the shared primitive owns its
 * geometry and focus ring) and the full view is a card. Both need the same
 * href + intercepted click, so that pair is built once here.
 */
function EntityAnchor({
  entity,
  onSelect,
  render,
}: {
  entity: BudgetEntityNode
  onSelect: (value: string) => void
  render: (props: {
    href: string
    onClick: (event: React.MouseEvent<HTMLElement>) => void
  }) => React.ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {render({
          href: `/secretariat?entity=${encodeURIComponent(entity.entity)}`,
          onClick: (e) => {
            e.preventDefault()
            onSelect(entity.entity)
          },
        })}
      </TooltipTrigger>
      <ClickTooltip name={entity.entity_long} meta={entityMeta(entity)} />
    </Tooltip>
  )
}

/** Spells out the card's bare number for the hover tooltip. */
function entityMeta(entity: BudgetEntityNode): string {
  return `${entity.count.toLocaleString()} mandate${entity.count === 1 ? '' : 's'}`
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
  const mandates = `${entity.count.toLocaleString()} mandate${entity.count === 1 ? '' : 's'}`
  return (
    <EntityAnchor
      entity={entity}
      onSelect={onSelect}
      render={({ href, onClick }) => (
        <Chip
          tone={active ? 'selected' : 'neutral'}
          href={href}
          onClick={onClick}
        >
          <span className="font-medium">{entity.entity}</span>
          <ChipCount tone={active ? 'selected' : 'neutral'}>
            <span title={mandates}>{entity.count.toLocaleString()}</span>
          </ChipCount>
        </Chip>
      )}
    />
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
      render={({ href, onClick }) => (
        <a
          href={href}
          onClick={onClick}
          className={cn(
            'group flex items-start justify-between gap-2 rounded-lg border bg-white px-3 py-2 transition-all focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-1 focus-visible:outline-none',
            active
              ? 'border-un-blue'
              : 'border-border hover:border-un-blue hover:shadow-md'
          )}
        >
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  'text-sm font-semibold',
                  active ? 'text-un-blue-text' : 'text-foreground'
                )}
              >
                {entity.entity}
              </span>
              <ChipCount>
                <span
                  title={`${entity.count.toLocaleString()} mandate${entity.count === 1 ? '' : 's'}`}
                >
                  {entity.count.toLocaleString()}
                </span>
              </ChipCount>
            </div>
            {entity.entity_long && (
              // Multi-line rather than one truncated line — see MandatingBodiesDirectory;
              // `title` is the recovery path should a name still clamp.
              <div
                title={entity.entity_long}
                className="line-clamp-3 text-sm leading-snug text-muted-foreground"
              >
                {entity.entity_long}
              </div>
            )}
          </div>
          <ChevronRight
            className={cn(
              'mt-0.5 h-3.5 w-3.5 shrink-0',
              active ? 'text-un-blue-text' : 'text-muted-foreground group-hover:text-un-blue-text'
            )}
          />
        </a>
      )}
    />
  )
}
