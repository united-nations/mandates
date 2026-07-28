'use client'

import { Badge } from '@/components/ui/badge'
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
  BudgetStream,
  Entity,
  EntityWithCount,
  Mandate,
  Organ,
  OrganWithCount,
} from '@/types'

import { ChevronRight, MoveHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Fragment, useEffect, useRef, useState } from 'react'
import { titleCase } from 'title-case'
import { EntityBadge, FoundationalTag } from '../EntityBadge'
import { isFoundational } from '@/lib/foundational'
import { ORGAN_CATEGORIES } from '@/lib/organ-groups'
import { ColumnHeaderFilter, type FilterGroup } from './ColumnHeaderFilter'
import { BudgetLocationCell } from './BudgetLocationCell'
import { COLUMN_DEFINITIONS, getMandateUrl } from './MandateColumns'
import {
  GroupBadge,
  GroupMemberLine,
  SeriesMarkers,
} from './MandateSeriesIndicators'

/**
 * The pinned "Details" rail on the right edge. The border + left shadow are the
 * point: without them the rail reads as clipping the column underneath it
 * ("Budget Location" showing as "BU") instead of floating over it.
 */
const STICKY_DETAIL_CELL =
  'sticky right-0 z-10 border-l border-gray-200 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.18)]'

// Facet option lists for the column filter popovers. Named FilterFacets to
// avoid colliding with the data-layer FilterOptions (active filter *values*).
interface FilterFacets {
  budgetHierarchy: BudgetStream[]
  programmes: { value: string; count: number }[]
  subjects: { value: string; count: number }[]
  documentTypes: { value: string; count: number }[]
  agendaItems: { value: string; count: number }[]
  yearRange: { min: number; max: number }
  yearDistribution: Record<string, number>
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

  const currentSort =
    filters.sort_by || (filters.keyword ? 'default' : 'citing_entities_desc')

  const columns = COLUMN_DEFINITIONS.filter((col) =>
    visibleColumns.has(col.id)
  ).sort((a, b) => {
    // The detail column (the row's "Details" affordance) always stays
    // rightmost, even when extra columns are toggled on.
    if (a.id === 'detail') return 1
    if (b.id === 'detail') return -1
    return 0
  })

  const getFilterOptions = (columnId: string) => {
    switch (columnId) {
      case 'organ':
        // organCounts is already ordered by count DESC from the DB (faceted on
        // all other active filters, see getOrganCounts). label = short so the
        // acronym renders verbatim (titleCase would mangle e.g. ECOSOC).
        return organCounts.map((o) => ({
          value: o.short,
          label: o.short,
          count: o.count,
        }))
      case 'entity_list':
        return entityCounts.map((e) => ({ value: e.entity, count: e.count }))
      case 'subjects':
        return filterOptions.subjects
      case 'document_type':
        return filterOptions.documentTypes
      case 'agenda_item':
        return filterOptions.agendaItems
      default:
        return undefined
    }
  }

  // Organs group by their place in the UN system (shared with the /organs page).
  const getFilterGroups = (columnId: string): FilterGroup[] | undefined =>
    columnId === 'organ'
      ? ORGAN_CATEGORIES.map((c) => ({ label: c.label, values: c.organs }))
      : undefined

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

  const handleRowClick = (mandate: Mandate, e: React.MouseEvent) => {
    e.preventDefault()
    router.push(
      getMandateUrl(mandate.full_document_symbol, {
        ppb_version: filters.ppb_version,
        mode: filters.mode,
      })
    )
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
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-gray-50 hover:bg-gray-50">
                {grouped && <TableHead className="w-12 px-2" />}
                {columns.map((col) => (
                  <TableHead
                    key={col.id}
                    className={`${col.widthClass} ${col.minWidthClass || ''} ${col.align === 'right' ? 'text-right' : ''} ${col.id === 'detail' ? STICKY_DETAIL_CELL + ' bg-gray-50' : ''} h-10 px-3 text-xs font-medium tracking-wider text-muted-foreground uppercase`}
                  >
                    {col.id === 'detail' ? (
                      // The rail carries no filter or sort, but the header cell
                      // still has to name its column for assistive tech.
                      <span className="sr-only">Details</span>
                    ) : (
                      <ColumnHeaderFilter
                        column={col}
                        currentSort={currentSort}
                        filterOptions={getFilterOptions(col.id)}
                        filterGroups={getFilterGroups(col.id)}
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
                      {grouped && (
                        <TableCell className="w-12 px-2 py-2 align-top">
                          <span className="flex h-5 items-center">
                            <GroupBadge
                              mandate={mandate}
                              expanded={isExpanded}
                              onToggle={() =>
                                toggleGroup(mandate.full_document_symbol)
                              }
                            />
                          </span>
                        </TableCell>
                      )}
                      {columns.map((col) => (
                        <TableCell
                          key={col.id}
                          className={`${col.align === 'right' ? 'text-right' : ''} ${col.id === 'detail' ? STICKY_DETAIL_CELL + ' bg-white group-hover:bg-gray-50' : ''} overflow-hidden px-3 py-2 align-top text-sm`}
                        >
                          <CellContent
                            columnId={col.id}
                            mandate={mandate}
                            entitiesData={entitiesData}
                            findOrganLong={findOrganLong}
                            onEntityClick={(entity) =>
                              setFilter('entity', entity)
                            }
                          />
                          {col.id === 'symbol' &&
                            (!grouped || (mandate.group?.size ?? 1) <= 1) && (
                              <span className="ml-1.5">
                                <SeriesMarkers mandate={mandate} />
                              </span>
                            )}
                        </TableCell>
                      ))}
                    </TableRow>
                    {grouped &&
                      isExpanded &&
                      (mandate.group?.members ?? []).map((member) => (
                        <TableRow
                          key={member.symbol}
                          className="cursor-pointer border-b border-gray-100 bg-gray-50/60 hover:bg-gray-100"
                          onClick={() =>
                            router.push(
                              getMandateUrl(member.symbol, {
                                ppb_version: filters.ppb_version,
                                mode: filters.mode,
                              })
                            )
                          }
                        >
                          <TableCell
                            colSpan={columns.length + 1}
                            className="px-3 py-1.5 pl-11"
                          >
                            <GroupMemberLine member={member} />
                          </TableCell>
                        </TableRow>
                      ))}
                  </Fragment>
                )
              })}
              {mandates.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={grouped ? columns.length + 1 : columns.length}
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
 */
const PILL_MAX_SHOWN = 2

function PillList({ items }: { items: string[] }) {
  if (items.length === 0) return null
  const remaining = items.length - PILL_MAX_SHOWN
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex max-w-[200px] cursor-default items-center gap-1">
          {items.slice(0, PILL_MAX_SHOWN).map((text, i) => (
            <span
              key={i}
              className="min-w-0 truncate rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700"
            >
              {text}
            </span>
          ))}
          {remaining > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground">
              +{remaining}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm border bg-white p-2 shadow-lg">
        <div className="flex flex-wrap gap-1">
          {items.map((text, i) => (
            <span
              key={i}
              className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs whitespace-nowrap text-gray-700"
            >
              {text}
            </span>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function CellContent({
  columnId,
  mandate,
  entitiesData,
  findOrganLong,
  onEntityClick,
}: {
  columnId: string
  mandate: Mandate
  entitiesData: Entity[]
  findOrganLong: (short: string) => string
  onEntityClick: (entity: string) => void
}) {
  switch (columnId) {
    case 'symbol': {
      const symbol = mandate.full_document_symbol
      const highlighted = mandate.highlightedFields?.full_document_symbol
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-un-blue transition-colors hover:bg-blue-100">
              {highlighted ? (
                <span dangerouslySetInnerHTML={{ __html: highlighted }} />
              ) : (
                symbol
              )}
            </span>
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
        <div className="leading-tight">
          {highlighted ? (
            <span dangerouslySetInnerHTML={{ __html: highlighted }} />
          ) : (
            title
          )}
        </div>
      )
    }

    case 'organ':
      return mandate.body ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="secondary"
              className="border-0 bg-gray-200! text-xs font-medium whitespace-nowrap text-gray-700!"
            >
              {mandate.body}
            </Badge>
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

    case 'citations':
      return <span className="tabular-nums">{mandate.num_citations}</span>

    case 'entity_list': {
      const foundational = mandate.foundational_entities ?? []
      // Foundational citers first: an entity that cites the document as the
      // instrument its mandate derives from is the most interesting one in the
      // row, and only the first two entities are visible before the "+N".
      const entities = (mandate.entities || [])
        .filter((e) => e !== null)
        .sort((a, b) => {
          const aFound = foundational.includes(a)
          const bFound = foundational.includes(b)
          if (aFound !== bFound) return aFound ? -1 : 1
          return a.localeCompare(b)
        })
      if (entities.length === 0) return null
      const maxShow = 2
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
              variant="muted"
              className="font-bold"
              onClick={() => onEntityClick(entity)}
            />
            {longName && longName !== entity && (
              <span className="text-xs text-muted-foreground">{longName}</span>
            )}
            {isFoundational(entity, foundational) && <FoundationalTag />}
          </span>
        ) : (
          <EntityBadge
            key={entity}
            entity={entity}
            entityLong={longName}
            foundational={isFoundational(entity, foundational)}
            variant="muted"
            className="font-bold"
            onClick={() => onEntityClick(entity)}
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
      // affordance for it, so the click is left to bubble.
      return (
        <button
          type="button"
          tabIndex={-1}
          className="inline-flex items-center gap-0.5 rounded border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors group-hover:border-un-blue group-hover:text-un-blue"
        >
          Details
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )

    case 'subjects':
      return (
        <PillList
          items={(mandate.subject_headings || []).map((s) => titleCase(s))}
        />
      )

    case 'budget_location':
      return <BudgetLocationCell locations={mandate.budget_locations ?? []} />

    case 'document_type':
      return mandate.type ? (
        <span className="text-xs">{mandate.type}</span>
      ) : null

    case 'agenda_item':
      return <PillList items={mandate.agenda_item_titles || []} />

    default:
      return null
  }
}
