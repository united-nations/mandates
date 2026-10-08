'use client'

import { useMemo, useState } from 'react'
import type { EntityExpenditure, ExpenditureMap } from '@/lib/entity-expenditure'
import { ExpenditureAmount } from '@/components/ExpenditureAmount'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  DetailFootnote,
  DetailSectionHeading,
} from '@/components/MandateDetailUi'
import { ChipDot } from '@/components/ui/chip'
import { explainerTexts } from '@/lib/en_text_contents'
import {
  FOUNDATIONAL_DOT_LEGEND,
  isFoundational,
  MARK_FOUNDATIONAL_CHIPS_ON_DETAIL_PAGE,
} from '@/lib/foundational'
import { cn } from '@/lib/utils'
import type { BudgetLocation, Entity, Mandate } from '@/types'

export { ExpenditureAmount, formatBudgetUsd } from '@/components/ExpenditureAmount'

/**
 * "Who cites this mandate in the budget?" — one row per place in the budget
 * this document is cited from: the entity, where in its fascicle, how big a
 * share of that entity's subprogramme this is, and a way out to the primary
 * budget data on open.un.org.
 *
 * Used to be one chip per entity with the budget path behind a popover. A
 * table earns its keep here because every one of those things — location,
 * count, outlink — is a property of a LOCATION, not of the entity, and an
 * entity can cite this document from more than one place: once in its
 * "Mandates and background" narrative, once in a different subprogramme's
 * Legislative mandates list. Folding those into one chip's popover was
 * already stretching the shape; a row per (entity, location) says exactly
 * what is true instead of summarising it away.
 *
 * Rows with no budget location are real, not a bug: PKM and Plan Outline
 * citations sit outside the regular-budget part structure entirely (see
 * getMandateCitations in lib/data/mandates.ts), so they never had one to
 * begin with. They still get a row — entity and where-in-the-fascicle only,
 * no location text, no count, no outlink — so switching to a table cannot
 * silently drop an entity the chip row used to show.
 */

interface CitationCountsProps {
  mandate: Mandate
  entities: Entity[]
  expenditures?: ExpenditureMap
}

const explorerUrl = (key: string, value: string) =>
  `/secretariat?${key}=${encodeURIComponent(value)}`

interface CitationRow {
  key: string
  entity: string
  entityLong?: string
  foundational: boolean
  location: BudgetLocation | null
}

const DEFAULT_SHOWN = 5

export function CitationCounts({ mandate, entities, expenditures = {} }: CitationCountsProps) {
  const [showAll, setShowAll] = useState(false)

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

  // Distinct citing entities. Alphabetical, unless the section is marking the
  // "Mandates and background" ones, in which case they lead.
  const citingEntities = useMemo(() => {
    const seen = new Set<string>()
    for (const citation of mandate.citation_info ?? []) {
      if (citation.entity) seen.add(citation.entity)
    }
    const distinct = [...seen]
    if (!MARK_FOUNDATIONAL_CHIPS_ON_DETAIL_PAGE) {
      return distinct.sort((a, b) => a.localeCompare(b))
    }
    return distinct.sort((a, b) => {
      const aFound = foundationalEntities.includes(a)
      const bFound = foundationalEntities.includes(b)
      if (aFound !== bFound) return aFound ? -1 : 1
      return a.localeCompare(b)
    })
  }, [mandate.citation_info, foundationalEntities])

  // One row per (entity, location) — an entity with citations at two budget
  // locations gets two rows, in entity order. An entity with no location at
  // all (PKM / Plan Outline only) still gets exactly one fallback row, so the
  // table cannot show fewer entities than the chip row used to.
  const rows = useMemo(() => {
    const result: CitationRow[] = []
    for (const entity of citingEntities) {
      const foundational = isFoundational(entity, foundationalEntities)
      const entityLong = entityLongNames.get(entity)
      const locations = locationsByEntity.get(entity) ?? []

      if (locations.length === 0) {
        result.push({
          key: entity,
          entity,
          entityLong,
          foundational,
          location: null,
        })
        continue
      }

      const seenLocations = new Map<string, BudgetLocation>()
      for (const location of locations) {
        const key = [
          location.stream,
          location.part ?? '',
          location.section ?? '',
          location.subprogramme ?? '',
        ].join(' ')
        if (!seenLocations.has(key)) seenLocations.set(key, location)
      }
      for (const [key, location] of seenLocations) {
        result.push({
          key: `${entity} ${key}`,
          entity,
          entityLong,
          foundational,
          location,
        })
      }
    }
    return result
  }, [citingEntities, foundationalEntities, entityLongNames, locationsByEntity])

  if (rows.length === 0) return null

  const shown = showAll ? rows : rows.slice(0, DEFAULT_SHOWN)
  const hidden = rows.length - shown.length

  return (
    <section className="space-y-3">
      <DetailSectionHeading
        hint={`${citingEntities.length} ${
          citingEntities.length === 1 ? 'entity' : 'entities'
        }`}
        howTo="Each row is one place in the budget this document is cited from — the entity, where in its fascicle, and how many mandates that entity cites at the same subprogramme."
        disclaimer={explainerTexts.mandateDetail.citationCounts.disclaimer}
      >
        Who cites this mandate in the budget?
      </DetailSectionHeading>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="flex min-h-10 items-baseline gap-2 border-t border-border py-1 text-xs font-medium text-muted-foreground">
            <span className={COL.entity}>Entity</span>
            <span className={COL.location}>Budget section</span>
            <span className={COL.subprogramme}>Subprogramme</span>
            <span className={COL.count}>Total mandates cited</span>
            <span className={COL.budget}>
              {explainerTexts.entityExpenditure.heading}
            </span>
          </div>

          <ul className="divide-y divide-gray-100 border-y border-border">
            {shown.map((row) => (
              <CitationRowItem key={row.key} row={row} expenditure={expenditures[row.entity]} />
            ))}
          </ul>
        </div>
      </div>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="inline-flex items-center gap-1 text-sm font-medium text-un-blue-text hover:underline"
        >
          <ChevronDown className="h-3 w-3" />
          Show all {rows.length}
        </button>
      )}
      {showAll && rows.length > DEFAULT_SHOWN && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="inline-flex items-center gap-1 text-sm font-medium text-un-blue-text hover:underline"
        >
          <ChevronUp className="h-3 w-3" />
          Show fewer
        </button>
      )}

      <p className="text-sm text-muted-foreground">{explainerTexts.entityExpenditure.note}</p>

      {/* The dot legend — the one explanation of the dot in the whole app —
          rendered only when a dot is actually on screen, which is never
          while the marking is off. */}
      {MARK_FOUNDATIONAL_CHIPS_ON_DETAIL_PAGE &&
        rows.some((row) => row.foundational) && (
          <DetailFootnote>{FOUNDATIONAL_DOT_LEGEND}</DetailFootnote>
        )}
    </section>
  )
}

/**
 * "Subprogramme 2. Inclusive social development" → "Inclusive social
 * development". The number already has its own column, so repeating it in
 * the label spends the widest column in the row on a word and a digit.
 */
const subprogrammeLabel = (subprogramme: string): string =>
  subprogramme.replace(/^Sub-?programme\s+[\dA-Z]+\.?\s*/i, '')

/**
 * The column widths, in one place, so the header and the rows cannot drift
 * apart — the alignment down each column is the point of the table, and two
 * hand-kept copies of six widths is exactly how that gets lost.
 */
const COL = {
  count: 'w-24 shrink-0 text-right tabular-nums',
  entity: 'w-20 shrink-0',
  section: 'w-8 shrink-0 text-right tabular-nums',
  location: 'min-w-0 flex-1',
  title: 'min-w-0 flex-1',
  subprogramme: 'w-40 shrink-0',
  budget: 'w-28 shrink-0 text-right tabular-nums',
} as const

function CitationRowItem({ row, expenditure }: { row: CitationRow; expenditure?: EntityExpenditure }) {
  const { entity, entityLong, foundational, location } = row
  const marked = MARK_FOUNDATIONAL_CHIPS_ON_DETAIL_PAGE && foundational

  const sectionTitle = location?.section_title || null
  const subprogramme = location?.subprogramme
    ? subprogrammeLabel(location.subprogramme)
    : null
  const count = location?.total_citations_at_location ?? null
  // The full path, for the row's tooltip: the columns truncate, and at sheet
  // width the section title is the first thing to lose its tail.
  const fullLabel = location
    ? [
        location.section ? `Section ${location.section}.` : null,
        sectionTitle,
        location.subprogramme,
      ]
        .filter(Boolean)
        .join(' ')
    : 'No budget location recorded for this citation.'

  return (
    <li className="min-h-8 py-1 text-sm text-foreground whitespace-nowrap">
      <div className="flex items-baseline gap-2">
        {/* Every cell renders even when empty: a cell that disappears takes
            its column's alignment with it, and alignment down the column is
            the whole point of the table. */}
        <a
          href={explorerUrl('entity', entity)}
          title={entityLong ?? entity}
          className={cn(
            COL.entity,
            'flex items-baseline gap-1 truncate font-medium text-foreground hover:text-un-blue-text hover:underline'
          )}
        >
          {entity}
          {marked && <ChipDot />}
        </a>
        <div className={cn(COL.location, 'flex items-baseline gap-2')}>
          <span className={cn(COL.section, 'truncate text-foreground')}>
            {location?.section ?? '—'}
          </span>
          <span
            className={cn(COL.title, 'truncate text-foreground')}
            title={fullLabel}
          >
            {sectionTitle ?? fullLabel}
          </span>
        </div>
        <span className={cn(COL.subprogramme, 'truncate text-foreground')} title={location?.subprogramme ?? undefined}>
          {subprogramme ?? ''}
        </span>
        <span
          className={cn(COL.count, 'text-foreground')}
          title={
            count === null
              ? undefined
              : `${count} mandate${count === 1 ? '' : 's'} cited by ${entity} at this location`
          }
        >
          {count ?? ''}
        </span>
        <span className={cn(COL.budget, 'inline-flex items-baseline justify-end gap-2')}>
          <ExpenditureAmount expenditure={expenditure} scopeLabel={entityLong ?? entity} />
        </span>
      </div>
    </li>
  )
}
