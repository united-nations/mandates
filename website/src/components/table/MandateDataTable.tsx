'use client'

import { Chip } from '@/components/ui/chip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { useFilters } from '@/contexts/FilterContext'
import type {
  Entity,
  EntityWithCount,
  Mandate,
  Organ,
  OrganWithCount,
} from '@/types'

import { ChevronRight, MoveHorizontal } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Fragment, useEffect, useRef, useState } from 'react'
import { titleCase } from 'title-case'
import { EntityBadge, FoundationalTag } from '../EntityBadge'
import { DocumentSymbol } from '@/components/DocumentSymbol'
import { isFoundational } from '@/lib/foundational'
import { positiveTerms } from '@/lib/search-query'
import { ColumnHeaderFilter } from './ColumnHeaderFilter'
import { BudgetLocationCell } from './BudgetLocationCell'
import {
  getColumnFilterGroups,
  getColumnFilterOptions,
  type FilterFacets,
} from './columnFacets'
import {
  COLUMN_DEFINITIONS,
  getMandateUrl,
  tableMinWidth,
} from './MandateColumns'
import {
  GroupBadge,
  GroupHiddenVersionsNote,
  GroupMemberLine,
  groupHasHiddenVersions,
  groupMemberEntries,
  SeriesMarkers,
} from './MandateSeriesIndicators'
import type { FilterParamKey } from '@/lib/filter-constants'

/**
 * The pinned "Details" rail on the right edge. The border + left shadow are the
 * point: without them the rail reads as clipping the column underneath it
 * ("Budget Location" showing as "BU") instead of floating over it.
 */
const STICKY_DETAIL_CELL =
  'sticky right-0 z-10 border-l border-gray-200 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.18)]'

/** Cell text alignment, from the column's `align`. */
const ALIGN_CLASS: Record<string, string> = {
  right: 'text-right',
  center: 'text-center',
}

interface MandateDataTableProps {
  mandates: Mandate[]
  organsData: Organ[]
  entitiesData: Entity[]
  /** Count-bearing facets for the organ/entity column filters. The reference
   *  lists (organsData/entitiesData) are kept separate because they're also
   *  used for short↔long lookups in cell rendering. */
  organCounts: OrganWithCount[]
  entityCounts: EntityWithCount[]
  filterOptions: FilterFacets
  /** Which columns to render. The picker that edits this set lives in the
   *  explorer toolbar (ColumnPicker), not in the table header. */
  visibleColumns: Set<string>
}

export function MandateDataTable({
  mandates,
  organsData,
  entitiesData,
  organCounts,
  entityCounts,
  filterOptions,
  visibleColumns,
}: MandateDataTableProps) {
  const { filters, setFilter, isPending } = useFilters()
  const router = useRouter()
  const searchParams = useSearchParams()

  const grouped = filters.group === '1'
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const toggleGroup = (symbol: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(symbol)) next.delete(symbol)
      else next.add(symbol)
      return next
    })
  }

  // The header's sort indicator has to say what the list is actually sorted
  // by. Under a keyword the data layer ranks by match — but only when the
  // query has a term to rank on; a query of nothing but exclusions keeps the
  // default sort, and the indicator follows the same rule.
  const ranked = !!filters.keyword && positiveTerms(filters.keyword).length > 0
  const currentSort =
    filters.sort_by || (ranked ? 'default' : 'citing_entities_desc')

  const columns = COLUMN_DEFINITIONS.filter((col) =>
    visibleColumns.has(col.id)
  ).sort((a, b) => {
    // The detail column (the row's "Details" affordance) always stays
    // rightmost, even when extra columns are toggled on. Every other pair
    // compares equal, and Array#sort is stable, so COLUMN_DEFINITIONS order is
    // preserved — the header and the body both map this same array, so they
    // cannot drift apart.
    if (a.id === 'detail') return 1
    if (b.id === 'detail') return -1
    return 0
  })

  // The grouped-mode expander lives inside the symbol cell, right of the badge.
  // Symbol is toggleable, so fall back to the leftmost visible column rather
  // than letting the only way to expand a group disappear with it.
  const badgeColumnId = columns.some((col) => col.id === 'symbol')
    ? 'symbol'
    : columns[0]?.id

  // The facet lists behind the header filters, shared with the columns/filters
  // menu in the toolbar (see columnFacets.ts) so the two cannot disagree.
  const facetSources = { organCounts, entityCounts, filterOptions }

  const findOrganLong = (short: string) =>
    organsData.find((o) => o.short === short)?.long || short

  // Whether the table is wider than its container. Turning every extra column
  // on takes the table well past the content width, and macOS overlay
  // scrollbars are invisible at rest — without a stated affordance the columns
  // past the right edge simply look truncated.
  const scrollBoxRef = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = useState(false)
  useEffect(() => {
    // The shadcn <Table> supplies its own `overflow-auto` wrapper and forwards
    // its ref to the <table>, so the scrolling element is reached through the
    // DOM rather than a ref of ours. <TooltipProvider> renders no element.
    const area = scrollBoxRef.current?.firstElementChild
    if (!(area instanceof HTMLElement)) return
    const measure = () => setOverflows(area.scrollWidth - area.clientWidth > 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(area)
    const table = area.firstElementChild
    if (table instanceof HTMLElement) observer.observe(table)
    return () => observer.disconnect()
  }, [columns.length, mandates.length])

  const mandateHref = (symbol: string) =>
    getMandateUrl(symbol, { ppb_version: filters.ppb_version }, searchParams)

  const handleRowClick = (mandate: Mandate, e: React.MouseEvent) => {
    e.preventDefault()
    router.push(mandateHref(mandate.full_document_symbol))
  }

  return (
    <div>
      {/* Table. The `[&>div…]` selectors reach the shadcn <Table>'s own scroll
          wrapper to keep a horizontal scrollbar permanently visible — macOS
          hides overlay scrollbars at rest, which is what made a 1601px table in
          a 1135px box read as broken rather than scrollable. */}
      <div
        ref={scrollBoxRef}
        className={`overflow-hidden rounded-lg border border-gray-200 transition-opacity duration-150 [&>div]:[scrollbar-color:#d1d5db_#f3f4f6] [&>div::-webkit-scrollbar]:h-2.5 [&>div::-webkit-scrollbar-thumb]:rounded-full [&>div::-webkit-scrollbar-thumb]:bg-gray-300 [&>div::-webkit-scrollbar-track]:bg-gray-100 ${isPending ? 'opacity-50' : 'opacity-100'}`}
      >
        <TooltipProvider>
          {/* Fixed layout, so the declared column widths bind instead of being
              recomputed from whatever the rows happen to contain. The title
              is the only column without a width, which is how the surplus
              reaches it and nothing else. */}
          <Table
            className="table-fixed"
            style={{ minWidth: tableMinWidth(columns) }}
          >
            <TableHeader>
              <TableRow className="border-b bg-gray-50 hover:bg-gray-50">
                {columns.map((col) => (
                  <TableHead
                    key={col.id}
                    style={{ width: col.flexible ? undefined : col.width }}
                    className={`${ALIGN_CLASS[col.align ?? ''] ?? ''} ${col.id === 'detail' ? STICKY_DETAIL_CELL + ' bg-gray-50' : ''} h-10 px-3 text-xs font-medium tracking-wider text-muted-foreground uppercase`}
                  >
                    {col.id === 'detail' ? (
                      // The rail carries no filter or sort, but the header cell
                      // still has to name its column for assistive tech.
                      <span className="sr-only">Details</span>
                    ) : (
                      <ColumnHeaderFilter
                        column={col}
                        currentSort={currentSort}
                        filterOptions={getColumnFilterOptions(
                          col.id,
                          facetSources
                        )}
                        filterGroups={getColumnFilterGroups(col.id)}
                        yearRange={filterOptions.yearRange}
                        budgetHierarchy={filterOptions.budgetHierarchy}
                      />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {mandates.map((mandate) => {
                const isExpanded = expandedGroups.has(
                  mandate.full_document_symbol
                )
                const dimmed = !grouped && !!mandate.series?.superseded_by
                return (
                  <Fragment key={mandate.full_document_symbol}>
                    <TableRow
                      className={`group cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${dimmed ? 'opacity-60' : ''}`}
                      onClick={(e) => handleRowClick(mandate, e)}
                    >
                      {columns.map((col) => {
                        // Markers and the group expander are mutually exclusive:
                        // a row either stands for a group (expander) or is a
                        // single document (series markers).
                        const showExpander = grouped && col.id === badgeColumnId
                        const showMarkers =
                          col.id === 'symbol' &&
                          (!grouped || (mandate.group?.size ?? 1) <= 1)
                        const cell = (
                          <CellContent
                            columnId={col.id}
                            mandate={mandate}
                            entitiesData={entitiesData}
                            findOrganLong={findOrganLong}
                            onFacetClick={setFilter}
                            href={mandateHref(mandate.full_document_symbol)}
                          />
                        )
                        return (
                          <TableCell
                            key={col.id}
                            className={`${ALIGN_CLASS[col.align ?? ''] ?? ''} ${col.id === 'detail' ? STICKY_DETAIL_CELL + ' bg-white group-hover:bg-gray-50' : ''} overflow-hidden px-3 py-2 align-top text-sm`}
                          >
                            {showExpander || showMarkers ? (
                              // In the symbol cell, h-5 keeps the row exactly as
                              // tall as it was when the expander had a column of
                              // its own. In the fallback column (symbol hidden)
                              // the content can be multi-line, so it only aligns
                              // to the top.
                              <span
                                className={
                                  col.id === 'symbol'
                                    ? 'flex h-5 items-center gap-1.5'
                                    : 'flex items-start gap-1.5'
                                }
                              >
                                {cell}
                                {showMarkers && (
                                  <SeriesMarkers mandate={mandate} />
                                )}
                                {showExpander && (
                                  <GroupBadge
                                    mandate={mandate}
                                    expanded={isExpanded}
                                    onToggle={() =>
                                      toggleGroup(mandate.full_document_symbol)
                                    }
                                  />
                                )}
                              </span>
                            ) : (
                              cell
                            )}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                    {grouped &&
                      isExpanded &&
                      groupMemberEntries(mandate).map((member) => (
                        <TableRow
                          key={member.symbol}
                          className="cursor-pointer border-b border-gray-100 bg-gray-50/60 hover:bg-gray-100"
                          onClick={() =>
                            router.push(mandateHref(member.symbol))
                          }
                        >
                          <TableCell
                            colSpan={columns.length}
                            className="px-3 py-1.5 pl-11"
                          >
                            <GroupMemberLine member={member} />
                          </TableCell>
                        </TableRow>
                      ))}
                    {grouped &&
                      isExpanded &&
                      groupHasHiddenVersions(mandate) && (
                        <TableRow
                          className="cursor-pointer border-b border-gray-100 bg-gray-50/60 hover:bg-gray-100"
                          onClick={(e) => handleRowClick(mandate, e)}
                        >
                          <TableCell
                            colSpan={columns.length}
                            className="px-3 py-1.5 pl-11"
                          >
                            <GroupHiddenVersionsNote mandate={mandate} />
                          </TableCell>
                        </TableRow>
                      )}
                  </Fragment>
                )
              })}
              {mandates.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No mandates found matching the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TooltipProvider>
      </div>
      {overflows && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MoveHorizontal aria-hidden className="h-3.5 w-3.5" />
          More columns to the right — scroll the table sideways.
        </p>
      )}
    </div>
  )
}

/**
 * A short list of labels in a narrow cell. Only the first two are rendered, each
 * with its own ellipsis, and the rest collapse into "+N" — the previous version
 * let the pills overflow a clipped box, which cut labels mid-word ("Internati",
 * "Gender Equi") with nothing to say they had been cut. The tooltip has all of
 * them in full.
 *
 * NOTE: this one component renders two unrelated taxonomies — UNBIS subject
 * headings and GA/SC agenda items — with the same visual. It carried a `kind`
 * prop meant to split them, but the ornament it selected never shipped, so the
 * prop was inert; it is gone rather than left as a false promise. If the two
 * should be distinguishable, that needs a real ornament, not a flag.
 *
 * Truncation goes through Chip's `truncate` prop, which puts the ellipsis on a
 * block span around the label. A Chip is a flex container, and
 * `text-overflow: ellipsis` does not apply to one — clipping the chip itself
 * cuts the text with no "…", the mid-word cut this component exists to prevent.
 *
 * Every pill filters by its facet; see `onSelect`.
 */
const PILL_MAX_SHOWN = 2

/** A pill's display label and the facet value it filters by (they differ:
 *  subjects are title-cased for display, the filter matches case-insensitively). */
interface PillItem {
  value: string
  label: string
}

function PillList({
  items,
  onSelect,
}: {
  items: PillItem[]
  onSelect: (value: string) => void
}) {
  if (items.length === 0) return null
  const remaining = items.length - PILL_MAX_SHOWN
  // Every pill filters. stopPropagation is not optional here: these sit inside
  // a row that navigates on click, so without it a click would both filter and
  // open the mandate, and the navigation would win.
  const select = (event: React.MouseEvent, value: string) => {
    event.stopPropagation()
    onSelect(value)
  }
  // A HoverCard, not a Tooltip, now that the overflow pills are real controls:
  // the same mechanism the entity column already uses for the same job (a
  // tooltip is for describing, and its content is not a place to put buttons).
  return (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className="flex max-w-[200px] cursor-default items-center gap-1">
          {items.slice(0, PILL_MAX_SHOWN).map((item, i) => (
            <Chip
              key={i}
              density="dense"
              truncate
              onClick={(event) => select(event, item.value)}
              aria-label={`Filter by ${item.label}`}
            >
              {item.label}
            </Chip>
          ))}
          {remaining > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground">
              +{remaining}
            </span>
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto max-w-sm border bg-white p-2 shadow-lg">
        <div className="flex flex-wrap gap-1">
          {items.map((item, i) => (
            <Chip
              key={i}
              density="dense"
              className="whitespace-nowrap"
              onClick={(event) => select(event, item.value)}
              aria-label={`Filter by ${item.label}`}
            >
              {item.label}
            </Chip>
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

/**
 * The entities citing a document, foundational citers first: an entity that
 * cites the document as the instrument its mandate derives from is the most
 * interesting one in the row, and only the first two are visible in the
 * Entities column before the "+N". The # Entities column counts this same list,
 * so the number and the chips behind it can never disagree.
 */
function citingEntities(mandate: Mandate): string[] {
  const foundational = mandate.foundational_entities ?? []
  return (mandate.entities || [])
    .filter((e) => e !== null)
    .sort((a, b) => {
      const aFound = foundational.includes(a)
      const bFound = foundational.includes(b)
      if (aFound !== bFound) return aFound ? -1 : 1
      return a.localeCompare(b)
    })
}

function CellContent({
  columnId,
  mandate,
  entitiesData,
  findOrganLong,
  onFacetClick,
  href,
}: {
  columnId: string
  mandate: Mandate
  entitiesData: Entity[]
  findOrganLong: (short: string) => string
  /**
   * Every facet chip in a row narrows the list by that facet. Additive
   * (`setFilter`), not single-facet: the row is already the result of a search
   * and whatever filters are active, so clicking a chip in it should refine
   * that, never silently discard it the way a directory jump does.
   */
  onFacetClick: (key: FilterParamKey, value: string) => void
  /** This row's mandate URL — the symbol badge links to it. */
  href: string
}) {
  switch (columnId) {
    case 'symbol': {
      const symbol = mandate.full_document_symbol
      const highlighted = mandate.highlightedFields?.full_document_symbol
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {/* The symbol NAVIGATES, it does not filter. A symbol is the
                document's identifier, not a facet (see DocumentSymbol) —
                filtering by it would just return the row you clicked. It is a
                real <a> so it can be opened in a new tab or copied; a plain
                click bubbles to the row, which preventDefaults and pushes the
                same URL. */}
            <DocumentSymbol href={href} className="whitespace-nowrap">
              {highlighted ? (
                <span dangerouslySetInnerHTML={{ __html: highlighted }} />
              ) : (
                symbol
              )}
            </DocumentSymbol>
          </TooltipTrigger>
          <TooltipContent>
            <p>{symbol}</p>
          </TooltipContent>
        </Tooltip>
      )
    }

    case 'title': {
      const title = mandate.displayTitle || 'Untitled'
      const highlighted = mandate.highlightedFields?.title
      return (
        // One line, so every row is the same height. `line-clamp-1` rather
        // than `truncate`: truncate sets white-space: nowrap, which makes the
        // column's min-content the longest title on the page — the opposite
        // of what a clamp is for. It also puts the ellipsis on a -webkit-box
        // rather than relying on text-overflow, which is what fails silently
        // on a flex container (see the note on PillList).
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="line-clamp-1 leading-tight">
              {highlighted ? (
                <span dangerouslySetInnerHTML={{ __html: highlighted }} />
              ) : (
                title
              )}
            </div>
          </TooltipTrigger>
          {/* The plain title, not the highlighted markup. Most titles are
              longer than the column once a few more are switched on, so this
              is where the untruncated string lives — the same treatment the
              symbol and organ cells already give their full values. */}
          <TooltipContent className="max-w-xs">
            <p>{title}</p>
          </TooltipContent>
        </Tooltip>
      )
    }

    case 'organ':
      return mandate.body ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Chip
              density="dense"
              className="whitespace-nowrap"
              onClick={(event) => {
                event.stopPropagation()
                onFacetClick('organ', mandate.body)
              }}
              aria-label={`Filter by ${findOrganLong(mandate.body)}`}
            >
              {mandate.body}
            </Chip>
          </TooltipTrigger>
          <TooltipContent>
            <p>{findOrganLong(mandate.body)}</p>
          </TooltipContent>
        </Tooltip>
      ) : null

    case 'year':
      return mandate.year && mandate.year !== '-' ? (
        <span>{mandate.year}</span>
      ) : null

    case 'entity_count': {
      // The same entities as the Entities column, as one number. Nothing at all
      // when there are none: in the all-documents scope most rows are uncited,
      // and a column of grey zeroes would drown the rows that are.
      const foundational = mandate.foundational_entities ?? []
      const entities = citingEntities(mandate)
      if (entities.length === 0) return null
      return (
        <HoverCard openDelay={100} closeDelay={100}>
          <HoverCardTrigger asChild>
            {/* A fixed square box, so it is a circle and not an oval whatever
                the number in it — the same treatment as the "N versions" badge
                in the symbol cell (MandateSeriesIndicators), filled rather than
                outlined because this one is a fact about the row, not a
                control. Three digits would stretch it, so it clamps at 99+;
                no document is cited by 100 entities anyway. */}
            <span className="inline-flex size-5 cursor-default items-center justify-center rounded-full bg-un-blue text-[11px] font-medium text-white tabular-nums">
              {entities.length > 99 ? '99+' : entities.length}
            </span>
          </HoverCardTrigger>
          <HoverCardContent className="w-auto max-w-sm border bg-white p-2 shadow-lg">
            {/* Acronyms only — the long name is one hover further in, on each
                chip, and this popup exists to be scanned. */}
            <div className="flex flex-wrap gap-1">
              {entities.map((entity) => (
                <EntityBadge
                  key={entity}
                  entity={entity}
                  foundational={isFoundational(entity, foundational)}
                  onClick={() => onFacetClick('entity', entity)}
                />
              ))}
            </div>
          </HoverCardContent>
        </HoverCard>
      )
    }

    case 'entity_list': {
      const foundational = mandate.foundational_entities ?? []
      const entities = citingEntities(mandate)
      if (entities.length === 0) return null
      // One badge, not two. Two dividing a 150px cell left each showing two
      // characters of its acronym — "OD…", "C…" — and an acronym cut that
      // short is not a shortened answer the way a shortened phrase is, it is
      // no answer at all. One stays whole and the count absorbs the rest.
      //
      // Fixed at one rather than measured: how many fit depends on how wide
      // they render, so the choice is a fixed number or a layout measurement,
      // and one column of one fixed width does not earn a measurement layer.
      const maxShow = 1
      const visible = entities.slice(0, maxShow)
      const remaining = entities.length - maxShow

      const pill = (entity: string, inPopup: boolean) => {
        const longName = entitiesData.find(
          (e) => e.entity === entity
        )?.entity_long
        return inPopup ? (
          <span key={entity} className="flex items-center gap-1.5">
            <EntityBadge
              entity={entity}
              foundational={isFoundational(entity, foundational)}
              onClick={() => onFacetClick('entity', entity)}
            />
            {longName && longName !== entity && (
              <span className="text-xs text-muted-foreground">{longName}</span>
            )}
            {isFoundational(entity, foundational) && <FoundationalTag />}
          </span>
        ) : (
          // Still truncating, but with one badge to a cell it bites only on
          // the codes that are phrases rather than acronyms — the longest in
          // the reference list is "SESG-Horn of Africa", which does not fit
          // a 150px cell whole. Those shorten legibly, acronyms now have the
          // room not to, and the badge's tooltip carries the full name.
          <EntityBadge
            key={entity}
            entity={entity}
            entityLong={longName}
            foundational={isFoundational(entity, foundational)}
            onClick={() => onFacetClick('entity', entity)}
            truncate
          />
        )
      }

      if (remaining <= 0) {
        return (
          <div className="flex items-center gap-1 overflow-hidden">
            {entities.map((e) => pill(e, false))}
          </div>
        )
      }

      return (
        // The "+N" is the one thing here that cannot be guessed from what is
        // shown, and a clipped count reads as a smaller number rather than as
        // a truncation — "+21" cut short is "+2". So it holds its width and
        // the badge gives its own up on the rare row where something has to.
        <HoverCard openDelay={100} closeDelay={100}>
          <HoverCardTrigger asChild>
            <div className="flex cursor-default items-center gap-1 overflow-hidden">
              {visible.map((e) => pill(e, false))}
              <span className="shrink-0 text-xs text-muted-foreground">
                +{remaining}
              </span>
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-auto max-w-sm border bg-white p-2 shadow-lg">
            <div className="flex flex-wrap gap-1">
              {entities.map((e) => pill(e, true))}
            </div>
          </HoverCardContent>
        </HoverCard>
      )
    }

    case 'detail':
      // The whole row navigates (see handleRowClick); this is the visible
      // affordance for it, so the click is left to bubble. Icon-only, so the
      // aria-label is the button's only accessible name.
      //
      // ChevronRight because it already means "open this record" on the explore
      // cards and directory rows; Info is this app's marker for a data caveat.
      return (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Details"
          className="inline-flex items-center rounded border border-gray-200 bg-white p-1 text-muted-foreground transition-colors group-hover:border-un-blue group-hover:text-un-blue"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )

    case 'subjects':
      return (
        <PillList
          // The filter matches on LOWER(TRIM(...)) at both ends, so the
          // display form is a valid facet value — see the subject clause in
          // lib/data/mandates.ts.
          items={(mandate.subject_headings || []).map((s) => ({
            value: s,
            label: titleCase(s),
          }))}
          onSelect={(value) => onFacetClick('subject', value)}
        />
      )

    case 'budget_location':
      return <BudgetLocationCell locations={mandate.budget_locations ?? []} />

    case 'document_type':
      return mandate.type ? (
        <span className="text-xs">{mandate.type}</span>
      ) : null

    case 'agenda_item':
      return (
        <PillList
          items={(mandate.agenda_item_titles || []).map((t) => ({
            value: t,
            label: t,
          }))}
          onSelect={(value) => onFacetClick('agenda_item', value)}
        />
      )

    default:
      return null
  }
}
