'use client'

import { useMemo, useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  CHIP_BASE,
  CHIP_TONES,
  CHIP_TOUCH_TARGET,
  DetailFootnote,
  DetailSectionHeading,
} from '@/components/MandateDetailUi'
import { BUDGET_STREAM_LABELS } from '@/lib/filter-constants'
import {
  FOUNDATIONAL_LABEL,
  FOUNDATIONAL_TOOLTIP,
  isFoundational,
} from '@/lib/foundational'
import { cn } from '@/lib/utils'
import type { BudgetLocation, Entity, Mandate } from '@/types'
import { ChevronDown, ChevronUp, MousePointerClick } from 'lucide-react'

/**
 * "Who implements this mandate?" — the entities that cite the document in the
 * budget, as one wrapped row of acronym chips.
 *
 * The row is deliberately flat and dense: entities are the unit nearly everyone
 * reasons about, a document can be cited by thirty of them, and the long names
 * and budget structure that used to sit inline pushed the rest of the page off
 * screen. Both now live in the chip's popover, one click away.
 *
 * The popover is a Popover and not a hover tooltip on purpose: everything in it
 * — the budget stream, the part, the section, the subprogrammes — is a filter
 * the reader is meant to be able to travel into and click, which a tooltip that
 * dies on mouse-out cannot support.
 *
 * The per-entity "2x" counts are gone: they counted extraction rows, not
 * citation sites. An entity citing a document in both its "Mandates and
 * background" narrative and its Legislative mandates table produced two rows at
 * the *same* budget location; that fact is shown as what it means — a
 * foundational citation — instead of as an unexplained multiplier.
 */

interface CitationCountsProps {
  mandate: Mandate
  entities: Entity[]
}

const explorerUrl = (key: string, value: string) =>
  `/secretariat?${key}=${encodeURIComponent(value)}`

export function CitationCounts({ mandate, entities }: CitationCountsProps) {
  const [showAll, setShowAll] = useState(false)
  const VISIBLE = 24

  const foundationalEntities = useMemo(
    () => mandate.foundational_entities ?? [],
    [mandate.foundational_entities]
  )

  const entityLongNames = useMemo(() => {
    const map = new Map<string, string>()
    entities.forEach((entity) => map.set(entity.entity, entity.entity_long))
    return map
  }, [entities])

  /** Every budget place this document is cited from, indexed by entity. */
  const locationsByEntity = useMemo(() => {
    const map = new Map<string, BudgetLocation[]>()
    for (const location of mandate.budget_locations ?? []) {
      if (!location.entity) continue
      const list = map.get(location.entity)
      if (list) list.push(location)
      else map.set(location.entity, [location])
    }
    return map
  }, [mandate.budget_locations])

  // Distinct citing entities, foundational ones first — they are the ones a
  // reader scanning for "why does this entity exist" wants to see.
  const citingEntities = useMemo(() => {
    const seen = new Set<string>()
    for (const citation of mandate.citation_info ?? []) {
      if (citation.entity) seen.add(citation.entity)
    }
    return [...seen].sort((a, b) => {
      const aFound = foundationalEntities.includes(a)
      const bFound = foundationalEntities.includes(b)
      if (aFound !== bFound) return aFound ? -1 : 1
      return a.localeCompare(b)
    })
  }, [mandate.citation_info, foundationalEntities])

  if (citingEntities.length === 0) return null

  const shown = showAll ? citingEntities : citingEntities.slice(0, VISIBLE)

  return (
    <section className="space-y-3">
      <DetailSectionHeading
        hint={`${citingEntities.length} ${
          citingEntities.length === 1 ? 'entity' : 'entities'
        }`}
      >
        Who implements this mandate?
      </DetailSectionHeading>

      <div className="flex flex-wrap gap-1.5">
        {shown.map((entity) => (
          <EntityChip
            key={entity}
            entity={entity}
            entityLong={entityLongNames.get(entity)}
            foundational={isFoundational(entity, foundationalEntities)}
            locations={locationsByEntity.get(entity) ?? []}
          />
        ))}
        {citingEntities.length > VISIBLE && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-1 self-center text-xs font-medium text-un-blue hover:underline"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Show fewer
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Show all {citingEntities.length}
              </>
            )}
          </button>
        )}
      </div>

      <DetailFootnote>
        Click an entity to see its full name and where in the budget it cites
        this document.
      </DetailFootnote>
    </section>
  )
}

function EntityChip({
  entity,
  entityLong,
  foundational,
  locations,
}: {
  entity: string
  entityLong?: string
  foundational: boolean
  locations: BudgetLocation[]
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Budget details for ${entityLong ?? entity}`}
          className={cn(
            CHIP_BASE,
            CHIP_TONES[foundational ? 'accent' : 'default'],
            // Entity chips are the interaction the section's copy asks the
            // reader to perform, so they take the full 44px touch target on
            // small viewports rather than the shared 36px.
            CHIP_TOUCH_TARGET,
            'cursor-pointer',
            !foundational && 'hover:border-un-blue'
          )}
        >
          {entity}
          {foundational && (
            <span
              aria-hidden
              className="size-1.5 self-center rounded-full bg-un-blue-deep"
            />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        className="w-80 max-w-[calc(100vw-2rem)] space-y-3 rounded-lg border-gray-200 p-4"
      >
        <div>
          <a
            href={explorerUrl('entity', entity)}
            className="text-sm font-medium text-gray-900 hover:text-un-blue hover:underline"
          >
            {entityLong ?? entity}
          </a>
          <p className="mt-0.5 text-xs text-gray-500">{entity}</p>
        </div>

        {foundational && (
          <div className="border-l-2 border-un-blue-deep/40 pl-2">
            <span className="text-xs font-medium text-un-blue-deep">
              {FOUNDATIONAL_LABEL}
            </span>
            <p className="mt-0.5 text-xs text-gray-500">
              {foundationalExplanation()}
            </p>
          </div>
        )}

        {locations.length > 0 ? (
          <div className="space-y-2 border-t border-gray-200 pt-3">
            <p className="text-xs tracking-wide text-gray-600 uppercase">
              Where in the budget
            </p>
            {dedupeLocations(locations).map(({ key, location }) => (
              <div key={key} className="flex flex-wrap gap-1">
                <PopoverChip
                  href={explorerUrl('budget_document', location.stream)}
                >
                  {BUDGET_STREAM_LABELS[location.stream]}
                </PopoverChip>
                {location.part && (
                  <PopoverChip href={explorerUrl('budget_part', location.part)}>
                    Part {location.part}
                    {location.part_title ? `. ${location.part_title}` : ''}
                  </PopoverChip>
                )}
                {location.section && (
                  <PopoverChip href={explorerUrl('section', location.section)}>
                    Section {location.section}
                    {location.section_title
                      ? `. ${location.section_title}`
                      : ''}
                  </PopoverChip>
                )}
                {location.subprogramme && (
                  <PopoverChip
                    href={explorerUrl('subprogramme', location.subprogramme)}
                  >
                    {location.subprogramme}
                  </PopoverChip>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="border-t border-gray-200 pt-3 text-xs text-gray-500">
            No budget location recorded for this citation.
          </p>
        )}

        <a
          href={explorerUrl('entity', entity)}
          className="inline-flex items-center gap-1 text-xs text-un-blue hover:underline"
        >
          <MousePointerClick className="h-3.5 w-3.5" />
          Show all mandates cited by {entity}
        </a>
      </PopoverContent>
    </Popover>
  )
}

function PopoverChip({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      className="inline-flex items-baseline rounded-full border border-gray-200 bg-gray-50 px-2 py-1.5 text-[11px] text-gray-700 transition-colors hover:border-un-blue hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none sm:py-0.5"
    >
      {children}
    </a>
  )
}

/**
 * One row per distinct stream/part/section/subprogramme place. The identity of
 * a row is that composite key, so it is returned rather than discarded — a list
 * index would re-key every row whenever the set changes.
 */
function dedupeLocations(
  locations: BudgetLocation[]
): { key: string; location: BudgetLocation }[] {
  const seen = new Map<string, BudgetLocation>()
  for (const location of locations) {
    const key = [
      location.stream,
      location.part ?? '',
      location.section ?? '',
      location.subprogramme ?? '',
    ].join(' ')
    if (!seen.has(key)) seen.set(key, location)
  }
  return [...seen.entries()].map(([key, location]) => ({ key, location }))
}

/**
 * The badge above already says "Foundational", and the shared tooltip string
 * repeats it as a "Foundational: …" prefix — so the popover read "Foundational
 * / Foundational: this entity cites…". The prefix is stripped here rather than
 * edited out of lib/foundational.ts, because that string is also used where it
 * stands alone, and the label is a pending terminology decision that must stay
 * renameable in exactly one place.
 */
function foundationalExplanation(): string {
  const prefix = `${FOUNDATIONAL_LABEL}:`
  if (!FOUNDATIONAL_TOOLTIP.startsWith(prefix)) return FOUNDATIONAL_TOOLTIP
  const rest = FOUNDATIONAL_TOOLTIP.slice(prefix.length).trim()
  return rest.charAt(0).toUpperCase() + rest.slice(1)
}
