'use client'

import { useMemo, useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DetailDisclaimer,
  DetailFootnote,
  DetailSectionHeading,
} from '@/components/MandateDetailUi'
import { Chip, ChipDot } from '@/components/ui/chip'
import { BUDGET_STREAM_LABELS } from '@/lib/filter-constants'
import {
  FOUNDATIONAL_BOTH_NOTE,
  FOUNDATIONAL_DOT_LEGEND,
  FOUNDATIONAL_PART_IN_DOCUMENT,
  isFoundational,
  partInDocumentLabel,
} from '@/lib/foundational'
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
 * — the budget stream, the part, the section, the subprogramme — is a filter
 * the reader is meant to be able to travel into and click, which a tooltip that
 * dies on mouse-out cannot support.
 *
 * The popover carries no prose. It used to repeat the "Mandates and background"
 * explanation for every foundational entity; that explanation now lives once,
 * in the footnote under the chip row, which is also the only place the blue dot
 * is legended. A panel a reader has to open should answer "where", not re-teach
 * a concept the page already explained.
 *
 * The budget structure is a PATH, not a row of pills. Pills read as a set of
 * peers — Part, Section and Subprogramme are nested, and the `›` chain from the
 * table's Budget location column (components/table/BudgetLocationCell.tsx) says
 * so at a glance. That file renders into a table cell and a hover tooltip, so
 * its presentation is reproduced here rather than imported: this copy links
 * every segment into the filtered explorer and carries one extra level the
 * table has no room for.
 */

interface CitationCountsProps {
  mandate: Mandate
  entities: Entity[]
}

const explorerUrl = (key: string, value: string) =>
  `/secretariat?${key}=${encodeURIComponent(value)}`

/**
 * The join key between a `BudgetLocation` and the `citation_info` rows it was
 * built from.
 *
 * Both shapes come out of the same query in lib/data/mandates.ts
 * (`getMandateCitations`) over the same rows, but `budget_locations` is deduped
 * on the location itself and drops `part_in_document` in the process — that is
 * precisely the field the deepest level of the path needs, and the reason the
 * two have to be re-joined here. Section + entity + subprogramme is the
 * location's identity within one document's citations (part is functionally
 * determined by section, and the two shapes spell it differently anyway:
 * `budget_part` is a name in citation_info, a number in BudgetLocation).
 *
 * Null and '' are folded together because the two shapes normalize the same
 * missing value differently (`row.x || ''` vs `row.x ?? null`).
 */
const locationJoinKey = (
  section: string | null | undefined,
  entity: string | null | undefined,
  subprogramme: string | null | undefined
) => [section ?? '', entity ?? '', subprogramme ?? ''].join('\0')

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

  /**
   * Which section of the fascicle each location's citation was extracted from.
   * A location can legitimately have both values — an entity citing a document
   * in its narrative *and* listing it in its legislative mandates produces two
   * rows at the same budget location.
   */
  const partsInDocumentByLocation = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const citation of mandate.citation_info ?? []) {
      if (!citation.entity || !citation.part_in_document) continue
      const key = locationJoinKey(
        citation.section,
        citation.entity,
        citation['sub-programme']
      )
      const list = map.get(key)
      if (!list) map.set(key, [citation.part_in_document])
      else if (!list.includes(citation.part_in_document))
        list.push(citation.part_in_document)
    }
    // Narrative first when both are present, mirroring the chip row's order.
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a === FOUNDATIONAL_PART_IN_DOCUMENT) return -1
        if (b === FOUNDATIONAL_PART_IN_DOCUMENT) return 1
        return a.localeCompare(b)
      })
    }
    return map
  }, [mandate.citation_info])

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
        howTo={
          'Each chip is an entity that cites this document in its budget submission. Click a chip to see the entity’s full name and where in the budget the citation appears.'
        }
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
            partsInDocumentByLocation={partsInDocumentByLocation}
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

      {/* Three footnote lines, each its own block so the order holds at every
          width: the dot legend (the one explanation of the dot in the whole
          app, rendered only when a dot is actually on screen), the
          reassurance against misreading it, and last the i-marked extraction
          disclaimer. The disclaimer's wording is deliberately self-contained:
          a version that referred back to the fascicle would silently inherit
          the legend's condition and vanish with it. */}
      <div>
        {citingEntities.some((e) =>
          isFoundational(e, foundationalEntities)
        ) && (
          <>
            <DetailFootnote>{FOUNDATIONAL_DOT_LEGEND}</DetailFootnote>
            <DetailFootnote>{FOUNDATIONAL_BOTH_NOTE}</DetailFootnote>
          </>
        )}
        <DetailDisclaimer>
          Extracted automatically from each entity&rsquo;s budget submission.
        </DetailDisclaimer>
      </div>
    </section>
  )
}

function EntityChip({
  entity,
  entityLong,
  foundational,
  locations,
  partsInDocumentByLocation,
}: {
  entity: string
  entityLong?: string
  foundational: boolean
  locations: BudgetLocation[]
  partsInDocumentByLocation: Map<string, string[]>
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* PopoverTrigger supplies the onClick that opens the panel, so the
            chip resolves to a real <button> — the element, not the styling, is
            what makes it keyboard-reachable. Entity chips are the interaction
            the section's copy asks the reader to perform, so they take the full
            44px touch target on small viewports (density="touch"). */}
        <Chip
          density="touch"
          tone={foundational ? 'emphasis' : 'neutral'}
          aria-label={`Budget details for ${entityLong ?? entity}`}
        >
          {entity}
          {foundational && <ChipDot />}
        </Chip>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        className="w-80 max-w-[calc(100vw-2rem)] space-y-3 rounded-lg border-gray-200 p-4 sm:w-96"
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

        {locations.length > 0 ? (
          <div className="space-y-2 border-t border-gray-200 pt-3">
            <p className="text-xs tracking-wide text-gray-600 uppercase">
              Where in the budget
            </p>
            {dedupeLocations(locations).map(({ key, location }) => (
              <BudgetPath
                key={key}
                location={location}
                partsInDocument={
                  partsInDocumentByLocation.get(
                    locationJoinKey(
                      location.section,
                      location.entity,
                      location.subprogramme
                    )
                  ) ?? []
                }
              />
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

interface PathSegment {
  key: string
  label: string
  href?: string
}

/**
 * One citation site as a `›`-separated path, down the budget and then into the
 * fascicle: stream › part › section › subprogramme › which section of the
 * fascicle the citation was read from.
 *
 * That last level is the reason this is not just BudgetLocationCell: it is the
 * difference between "this entity's narrative says its mandate derives from
 * this document" and "this document appears in its list of legislative
 * mandates", and it is the question the popover was previously answering with a
 * paragraph of prose.
 *
 * The entity itself is not a segment here — the panel is already titled with
 * it, so repeating it would put the same word twice on a 320px card.
 */
function BudgetPath({
  location,
  partsInDocument,
}: {
  location: BudgetLocation
  partsInDocument: string[]
}) {
  const segments: PathSegment[] = [
    {
      key: 'stream',
      label: BUDGET_STREAM_LABELS[location.stream],
      href: explorerUrl('budget_document', location.stream),
    },
  ]

  if (location.part) {
    segments.push({
      key: 'part',
      label: `Part ${location.part}${
        location.part_title ? `. ${location.part_title}` : ''
      }`,
      href: explorerUrl('budget_part', location.part),
    })
  }
  if (location.section) {
    segments.push({
      key: 'section',
      label: `Section ${location.section}${
        location.section_title ? `. ${location.section_title}` : ''
      }`,
      href: explorerUrl('section', location.section),
    })
  }
  if (location.subprogramme) {
    segments.push({
      key: 'subprogramme',
      label: location.subprogramme,
      href: explorerUrl('subprogramme', location.subprogramme),
    })
  }
  if (partsInDocument.length > 0) {
    // Both values at one location is a real state, not a bug: the same
    // document can be cited in the narrative and listed in the table. Joined
    // into a single leaf so the chain never implies one nests inside the other.
    segments.push({
      key: 'part-in-document',
      label: partsInDocument.map(partInDocumentLabel).join(' · '),
    })
  }

  return (
    <p className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5 text-xs leading-relaxed">
      {segments.map((segment, index) => (
        <span key={segment.key} className="inline-flex items-baseline gap-1">
          {index > 0 && (
            <span aria-hidden className="text-gray-400">
              ›
            </span>
          )}
          {segment.href ? (
            <a
              href={segment.href}
              className="text-gray-700 hover:text-un-blue hover:underline"
            >
              {segment.label}
            </a>
          ) : (
            <span className="text-gray-500">{segment.label}</span>
          )}
        </span>
      ))}
    </p>
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
    ].join(' ')
    if (!seen.has(key)) seen.set(key, location)
  }
  return [...seen.entries()].map(([key, location]) => ({ key, location }))
}
