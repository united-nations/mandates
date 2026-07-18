'use client'

import { FoundationalTag } from '@/components/EntityBadge'
import { isFoundational } from '@/lib/foundational'
import type { BudgetStream, BudgetPartNode, BudgetPkoGroupNode } from '@/types'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'

/**
 * Presentational renderer for the budget hierarchy (`BudgetStream[]`):
 *
 *   Programme Budget  › Part › Section › Entity › Subprogramme
 *   Peacekeeping Ops   › Missions | Support account › Entity
 *   Plan Outline       (a leaf)
 *
 * The single source of truth for how the tree looks and expands. Behaviour is
 * injected so the same component backs both the table's column filter (clicking
 * sets a filter) and the detail page's "group by budget location" view (clicking
 * navigates). It owns nothing but expand/collapse state — search, active-filter
 * derivation, and data fetching live in the wrappers.
 *
 * Programme is deliberately not a level of its own — every section belongs to
 * exactly one programme, so its number and title ride along on the section
 * label. The PKO group headers (Missions / Support account) are structural: they
 * organise missions but are not themselves selectable.
 */

export type BudgetTreeLevel =
  | 'stream'
  | 'part'
  | 'section'
  | 'entity'
  | 'subprogramme'

interface BudgetStreamTreeProps {
  hierarchy: BudgetStream[]
  /** Currently-active value at each level, for highlighting. */
  active?: {
    stream?: string
    part?: string
    section?: string
    entity?: string
    subprogramme?: string
  }
  onSelect: (level: BudgetTreeLevel, value: string) => void
  /** Show the per-node document counts (off for single-document trees). */
  showCounts?: boolean
  /** Expand everything (used while searching). */
  forceExpandAll?: boolean
  /** Entities to flag as foundational (detail view). */
  foundationalEntities?: string[]
}

export function BudgetStreamTree({
  hierarchy,
  active = {},
  onSelect,
  showCounts = true,
  forceExpandAll = false,
  foundationalEntities = [],
}: BudgetStreamTreeProps) {
  // The two structured streams open to their first level by default; seed the
  // opened set with their keys. Toggling removes them (collapse), re-adds them
  // (expand).
  const [manuallyOpened, setManuallyOpened] = useState<Set<string>>(
    () =>
      new Set(
        hierarchy
          .filter((s) => s.type !== 'plan_outline')
          .map((s) => `stream:${s.type}`)
      )
  )

  const isOpen = (key: string, containsActive: boolean) =>
    forceExpandAll || manuallyOpened.has(key) || containsActive

  const toggle = (key: string) =>
    setManuallyOpened((open) => {
      const next = new Set(open)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const foundational = (entity: string | null) =>
    entity !== null && isFoundational(entity, foundationalEntities)

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
          count={showCounts ? part.count : undefined}
          isActive={partActive}
          isOpen={partOpen}
          hasChildren={part.sections.length > 0}
          onToggle={() => toggle(partKey)}
          onSelect={() => onSelect('part', part.part)}
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
                  count={showCounts ? section.count : undefined}
                  isActive={sectionActive}
                  isOpen={sectionOpen}
                  hasChildren={section.entities.length > 0}
                  onToggle={() => toggle(key)}
                  onSelect={() => onSelect('section', section.section)}
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
                          count={showCounts ? entity.count : undefined}
                          isActive={entityActive}
                          foundational={foundational(entity.entity)}
                          isOpen={entityOpen}
                          hasChildren={entity.subprogrammes.length > 0}
                          onToggle={() => toggle(entityKey)}
                          onSelect={() => onSelect('entity', entity.entity)}
                        />

                        {entityOpen &&
                          entity.subprogrammes.map((sp) => (
                            <TreeRow
                              key={`${entityKey}/${sp.subprogramme}`}
                              depth={4}
                              label={sp.subprogramme}
                              count={showCounts ? sp.count : undefined}
                              isActive={active.subprogramme === sp.subprogramme}
                              isOpen={false}
                              hasChildren={false}
                              onToggle={() => {}}
                              onSelect={() =>
                                onSelect('subprogramme', sp.subprogramme)
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
  // header is structural (not selectable); the entity rows are.
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
          count={showCounts ? group.count : undefined}
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
              count={showCounts ? entity.count : undefined}
              isActive={active.entity === entity.entity}
              foundational={foundational(entity.entity)}
              isOpen={false}
              hasChildren={false}
              onToggle={() => {}}
              onSelect={() => onSelect('entity', entity.entity)}
            />
          ))}
      </div>
    )
  }

  return (
    <div className="space-y-px">
      {hierarchy.map((stream) => {
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
              count={showCounts ? stream.count : undefined}
              isActive={streamActive}
              isOpen={streamOpen}
              hasChildren={hasChildren}
              onToggle={() => toggle(streamKey)}
              onSelect={() => onSelect('stream', stream.type)}
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
 * agree, which they do for most sections. Where they genuinely differ both are
 * shown, since collapsing them would lose the programme name.
 */
export function sectionLabel(section: {
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

interface TreeRowProps {
  depth: number
  label: string
  sublabel?: string
  count?: number
  isActive: boolean
  isOpen: boolean
  hasChildren: boolean
  /** When false the label is a plain (non-filtering) header, e.g. PKO groups. */
  selectable?: boolean
  foundational?: boolean
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
  foundational = false,
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
      {foundational && <FoundationalTag />}
      {count !== undefined && (
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {count}
        </span>
      )}
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
