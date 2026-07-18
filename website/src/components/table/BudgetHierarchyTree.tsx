'use client'

import { SearchInput } from '@/components/SearchInput'
import { useFilters } from '@/contexts/FilterContext'
import { FOUNDATIONAL_LABEL, FOUNDATIONAL_TOOLTIP } from '@/lib/foundational'
import type { BudgetStream, BudgetPartNode, BudgetPkoGroupNode } from '@/types'
import { ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

/**
 * The budget hierarchy as a browsable tree. The top level is the budget stream:
 *
 *   Programme Budget    › Part › Section › Entity › Subprogramme
 *   Peacekeeping Ops    › Missions | Support account › Entity
 *   Plan Outline        (a leaf)
 *
 * Clicking any node filters the table to the documents cited there; clicking
 * the active node again clears it. Programme is deliberately not a level of its
 * own — every section belongs to exactly one programme, so its number and title
 * ride along on the section label. The PKO group headers (Missions / Support
 * account) are structural: they organise missions but are not themselves a
 * filter.
 */

interface BudgetHierarchyTreeProps {
  hierarchy: BudgetStream[]
}

/** Which filter param each selectable level of the tree writes to. */
const LEVEL_PARAM = {
  stream: 'budget_document',
  part: 'budget_part',
  section: 'section',
  entity: 'entity',
  subprogramme: 'subprogramme',
} as const

export function BudgetHierarchyTree({ hierarchy }: BudgetHierarchyTreeProps) {
  const { filters, setFilter, clearFilter } = useFilters()
  const [search, setSearch] = useState('')
  // The two structured streams open to their first level by default; seed the
  // opened set with their keys so a fresh popover already shows Parts and the
  // PKO groups. Toggling removes them (collapse) and re-adds them (expand).
  const [manuallyOpened, setManuallyOpened] = useState<Set<string>>(
    () =>
      new Set(
        hierarchy
          .filter((s) => s.type !== 'plan_outline')
          .map((s) => `stream:${s.type}`)
      )
  )

  const active = {
    stream: filters.budget_document,
    part: filters.budget_part,
    section: filters.section,
    entity: filters.entity,
    subprogramme: filters.subprogramme,
  }

  const matches = useMemo(
    () => filterHierarchy(hierarchy, search.trim().toLowerCase()),
    [hierarchy, search]
  )

  // While searching, everything is expanded so hits are visible without
  // clicking. Otherwise a branch is open if the user opened it, or if it
  // contains the active filter (so a filtered URL lands with its node in view).
  const searching = search.trim().length > 0
  const isOpen = (key: string, containsActive: boolean) =>
    searching || manuallyOpened.has(key) || containsActive

  const toggle = (key: string) =>
    setManuallyOpened((open) => {
      const next = new Set(open)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const select = (level: keyof typeof LEVEL_PARAM, value: string) => {
    const param = LEVEL_PARAM[level]
    if (active[level] === value) clearFilter(param)
    else setFilter(param, value)
  }

  if (hierarchy.length === 0) {
    return (
      <p className="py-2 text-xs text-muted-foreground">
        No budget locations for the current filters.
      </p>
    )
  }

  // Part › Section › Entity › Subprogramme, rendered under a stream at depth 1+.
  const renderPart = (part: BudgetPartNode, streamKey: string) => {
    const partKey = `${streamKey}/${part.part}`
    const partActive = active.part === part.part
    const partHasActive =
      partActive ||
      part.sections.some(
        (s) =>
          active.section === s.section ||
          s.entities.some(
            (e) =>
              active.entity === e.entity ||
              e.subprogrammes.some(
                (sp) => active.subprogramme === sp.subprogramme
              )
          )
      )
    const partOpen = isOpen(partKey, partHasActive)

    return (
      <div key={partKey}>
        <TreeRow
          depth={1}
          label={`${part.part}. ${part.part_title}`}
          count={part.count}
          isActive={partActive}
          isOpen={partOpen}
          hasChildren={part.sections.length > 0}
          onToggle={() => toggle(partKey)}
          onSelect={() => select('part', part.part)}
        />

        {partOpen &&
          part.sections.map((section) => {
            const key = `${partKey}/${section.section}`
            const sectionActive = active.section === section.section
            const sectionHasActive =
              sectionActive ||
              section.entities.some(
                (e) =>
                  active.entity === e.entity ||
                  e.subprogrammes.some(
                    (sp) => active.subprogramme === sp.subprogramme
                  )
              )
            const sectionOpen = isOpen(key, sectionHasActive)

            return (
              <div key={key}>
                <TreeRow
                  depth={2}
                  label={sectionLabel(section)}
                  count={section.count}
                  isActive={sectionActive}
                  isOpen={sectionOpen}
                  hasChildren={section.entities.length > 0}
                  onToggle={() => toggle(key)}
                  onSelect={() => select('section', section.section)}
                />

                {sectionOpen &&
                  section.entities.map((entity) => {
                    const entityKey = `${key}/${entity.entity}`
                    const entityActive = active.entity === entity.entity
                    const entityHasActive =
                      entityActive ||
                      entity.subprogrammes.some(
                        (sp) => active.subprogramme === sp.subprogramme
                      )
                    const entityOpen = isOpen(entityKey, entityHasActive)

                    return (
                      <div key={entityKey}>
                        <TreeRow
                          depth={3}
                          label={entity.entity}
                          sublabel={entity.entity_long ?? undefined}
                          count={entity.count}
                          isActive={entityActive}
                          isOpen={entityOpen}
                          hasChildren={entity.subprogrammes.length > 0}
                          onToggle={() => toggle(entityKey)}
                          onSelect={() => select('entity', entity.entity)}
                        />

                        {entityOpen &&
                          entity.subprogrammes.map((sp) => (
                            <TreeRow
                              key={`${entityKey}/${sp.subprogramme}`}
                              depth={4}
                              label={sp.subprogramme}
                              count={sp.count}
                              isActive={active.subprogramme === sp.subprogramme}
                              isOpen={false}
                              hasChildren={false}
                              onToggle={() => {}}
                              onSelect={() =>
                                select('subprogramme', sp.subprogramme)
                              }
                            />
                          ))}
                      </div>
                    )
                  })}
              </div>
            )
          })}
      </div>
    )
  }

  // Peacekeeping group (Missions / Support account) › mission entity. The group
  // header is structural (not a filter); the entity rows are.
  const renderPkoGroup = (group: BudgetPkoGroupNode, streamKey: string) => {
    const groupKey = `${streamKey}/${group.group}`
    const groupHasActive = group.entities.some(
      (e) => active.entity === e.entity
    )
    const groupOpen = isOpen(groupKey, groupHasActive)

    return (
      <div key={groupKey}>
        <TreeRow
          depth={1}
          label={group.label}
          count={group.count}
          isActive={false}
          selectable={false}
          isOpen={groupOpen}
          hasChildren={group.entities.length > 0}
          onToggle={() => toggle(groupKey)}
          onSelect={() => {}}
        />

        {groupOpen &&
          group.entities.map((entity) => (
            <TreeRow
              key={`${groupKey}/${entity.entity}`}
              depth={2}
              label={entity.entity}
              sublabel={entity.entity_long ?? undefined}
              count={entity.count}
              isActive={active.entity === entity.entity}
              isOpen={false}
              hasChildren={false}
              onToggle={() => {}}
              onSelect={() => select('entity', entity.entity)}
            />
          ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <SearchInput
        placeholder="Search streams, parts, entities..."
        value={search}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setSearch(e.target.value)
        }
        variant="border-bottom"
      />

      {/* Cuts across the tree rather than sitting in it: a citation is
          foundational or not at every level at once. */}
      <label
        className="flex cursor-pointer items-center gap-2 text-xs"
        title={FOUNDATIONAL_TOOLTIP}
      >
        <input
          type="checkbox"
          checked={filters.foundational === 'true'}
          onChange={(e) =>
            e.target.checked
              ? setFilter('foundational', 'true')
              : clearFilter('foundational')
          }
          className="h-3.5 w-3.5 accent-un-blue-deep"
        />
        <span>{FOUNDATIONAL_LABEL} mandates only</span>
      </label>

      <div className="max-h-[420px] space-y-px overflow-y-auto">
        {matches.map((stream) => {
          const streamKey = `stream:${stream.type}`
          const streamActive = active.stream === stream.type
          const hasChildren =
            stream.type === 'ppb'
              ? stream.parts.length > 0
              : stream.type === 'pko'
                ? stream.groups.length > 0
                : false
          const streamHasActive =
            streamActive || streamContainsActive(stream, active)
          const streamOpen = isOpen(streamKey, streamHasActive)

          return (
            <div key={streamKey}>
              <TreeRow
                depth={0}
                label={stream.label}
                count={stream.count}
                isActive={streamActive}
                isOpen={streamOpen}
                hasChildren={hasChildren}
                onToggle={() => toggle(streamKey)}
                onSelect={() => select('stream', stream.type)}
              />

              {streamOpen &&
                stream.type === 'ppb' &&
                stream.parts.map((part) => renderPart(part, streamKey))}
              {streamOpen &&
                stream.type === 'pko' &&
                stream.groups.map((group) => renderPkoGroup(group, streamKey))}
            </div>
          )
        })}

        {matches.length === 0 && (
          <p className="py-2 text-xs text-muted-foreground">No matches.</p>
        )}
      </div>
    </div>
  )
}

/** Does the active entity/part/section/subprogramme sit inside this stream? */
function streamContainsActive(
  stream: BudgetStream,
  active: {
    part?: string
    section?: string
    entity?: string
    subprogramme?: string
  }
): boolean {
  if (stream.type === 'ppb') {
    return stream.parts.some(
      (part) =>
        active.part === part.part ||
        part.sections.some(
          (s) =>
            active.section === s.section ||
            s.entities.some(
              (e) =>
                active.entity === e.entity ||
                e.subprogrammes.some(
                  (sp) => active.subprogramme === sp.subprogramme
                )
            )
        )
    )
  }
  if (stream.type === 'pko') {
    return stream.groups.some((g) =>
      g.entities.some((e) => active.entity === e.entity)
    )
  }
  return false
}

/**
 * "Section 9 · Programme 7 — Economic and social affairs" when the two titles
 * agree, which they do for most sections. Where they genuinely differ (Section
 * 29A is the Department of Management Strategy, Policy and Compliance; its
 * Programme 25 is Management and support services) both are shown, since
 * collapsing them would lose the programme name.
 */
function sectionLabel(section: {
  section: string
  section_title: string
  programme: number | null
  programme_title: string | null
}): string {
  const prefix =
    section.programme !== null
      ? `Section ${section.section} · Programme ${section.programme}`
      : `Section ${section.section}`

  const sameTitle =
    section.programme_title !== null &&
    section.programme_title.toLowerCase() ===
      section.section_title.toLowerCase()

  if (section.programme_title === null || sameTitle) {
    return `${prefix} — ${section.section_title}`
  }
  return `${prefix} — ${section.section_title} / ${section.programme_title}`
}

/** Keep any branch with a hit at any depth, pruned to the matching children. */
function filterHierarchy(
  hierarchy: BudgetStream[],
  term: string
): BudgetStream[] {
  if (!term) return hierarchy

  const hit = (...values: (string | null)[]) =>
    values.some((v) => v?.toLowerCase().includes(term))

  return hierarchy
    .map((stream): BudgetStream | null => {
      if (hit(stream.label)) return stream

      if (stream.type === 'ppb') {
        const parts = filterParts(stream.parts, hit)
        return parts.length > 0 ? { ...stream, parts } : null
      }

      if (stream.type === 'pko') {
        const groups = stream.groups
          .map((group) => {
            if (hit(group.label)) return group
            const entities = group.entities.filter((e) =>
              hit(e.entity, e.entity_long)
            )
            return entities.length > 0 ? { ...group, entities } : null
          })
          .filter((g): g is BudgetPkoGroupNode => g !== null)
        return groups.length > 0 ? { ...stream, groups } : null
      }

      // plan_outline is a leaf: it only matches on its own label (handled above)
      return null
    })
    .filter((s): s is BudgetStream => s !== null)
}

function filterParts(
  parts: BudgetPartNode[],
  hit: (...values: (string | null)[]) => boolean
): BudgetPartNode[] {
  return parts
    .map((part) => {
      if (hit(part.part, part.part_title)) return part

      const sections = part.sections
        .map((section) => {
          if (
            hit(section.section, section.section_title, section.programme_title)
          ) {
            return section
          }
          const entities = section.entities.filter(
            (entity) =>
              hit(entity.entity, entity.entity_long) ||
              entity.subprogrammes.some((sp) => hit(sp.subprogramme))
          )
          return entities.length > 0 ? { ...section, entities } : null
        })
        .filter((s) => s !== null)

      return sections.length > 0 ? { ...part, sections } : null
    })
    .filter((p) => p !== null)
}

interface TreeRowProps {
  depth: number
  label: string
  sublabel?: string
  count: number
  isActive: boolean
  isOpen: boolean
  hasChildren: boolean
  /** When false the label is a plain (non-filtering) header, e.g. PKO groups. */
  selectable?: boolean
  onToggle: () => void
  onSelect: () => void
}

const INDENT = ['pl-0', 'pl-4', 'pl-8', 'pl-12', 'pl-16']

function TreeRow({
  depth,
  label,
  sublabel,
  count,
  isActive,
  isOpen,
  hasChildren,
  selectable = true,
  onToggle,
  onSelect,
}: TreeRowProps) {
  const body = (
    <>
      <span className="min-w-0 flex-1 truncate" title={sublabel ?? label}>
        {label}
        {sublabel && (
          <span className="ml-1.5 text-muted-foreground">{sublabel}</span>
        )}
      </span>
      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
        {count}
      </span>
    </>
  )

  return (
    <div className={`flex items-center gap-1 ${INDENT[depth]}`}>
      {hasChildren ? (
        <button
          type="button"
          onClick={onToggle}
          aria-label={isOpen ? 'Collapse' : 'Expand'}
          aria-expanded={isOpen}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ChevronRight
            className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          />
        </button>
      ) : (
        <span className="w-4 shrink-0" />
      )}

      {selectable ? (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={isActive}
          className={`flex min-w-0 flex-1 items-baseline gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-accent ${
            isActive ? 'bg-un-blue/10 font-medium text-un-blue' : ''
          }`}
        >
          {body}
        </button>
      ) : (
        <span className="flex min-w-0 flex-1 items-baseline gap-2 px-1.5 py-1 text-left text-xs font-medium text-muted-foreground">
          {body}
        </span>
      )}
    </div>
  )
}
