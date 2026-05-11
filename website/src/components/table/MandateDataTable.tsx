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
import { useFilters } from '@/contexts/FilterContext'
import type { BudgetDocument } from '@/lib/data/budget-documents'
import type { FilterParamKey } from '@/lib/filter-constants'
import type { Entity, Mandate, Organ } from '@/types'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { titleCase } from 'title-case'
import { EntityName } from '../EntityName'
import { ColumnHeaderFilter } from './ColumnHeaderFilter'
import { ColumnPicker } from './ColumnPicker'
import {
  COLUMN_DEFINITIONS,
  DEFAULT_VISIBLE_COLUMNS,
  getMandateUrl,
} from './MandateColumns'

interface FilterOptions {
  programmes: { value: string; count: number }[]
  subjects: { value: string; count: number }[]
  documentTypes: { value: string; count: number }[]
  agendaItems: { value: string; count: number }[]
  yearRange: { min: number; max: number }
  yearDistribution: Record<string, number>
  budgetDocuments: BudgetDocument[]
}

interface MandateDataTableProps {
  mandates: Mandate[]
  organsData: Organ[]
  entitiesData: Entity[]
  filterOptions: FilterOptions
  pageType: 'main' | 'entity' | 'organ'
  entityFilter?: string
  organFilter?: string
}

const STORAGE_KEY = 'mandate-table-columns'

function loadVisibleColumns(): Set<string> {
  if (typeof window === 'undefined') return DEFAULT_VISIBLE_COLUMNS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const ids = JSON.parse(stored) as string[]
      const all = new Set(COLUMN_DEFINITIONS.map((c) => c.id))
      const valid = ids.filter((id) => all.has(id))
      if (valid.length > 0) {
        const alwaysVisible = COLUMN_DEFINITIONS.filter(
          (c) => c.defaultVisible
        ).map((c) => c.id)
        return new Set([...alwaysVisible, ...valid])
      }
    }
  } catch {}
  return DEFAULT_VISIBLE_COLUMNS
}

export function MandateDataTable({
  mandates,
  organsData,
  entitiesData,
  filterOptions,
  pageType,
  entityFilter,
  organFilter,
}: MandateDataTableProps) {
  const { filters, clearFilter, isPending } = useFilters()
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS)

  useEffect(() => {
    setVisibleColumns(loadVisibleColumns())
  }, [])

  const handleToggleColumn = useCallback(
    (columnId: string) => {
      setVisibleColumns((prev) => {
        const next = new Set(prev)
        if (next.has(columnId)) {
          next.delete(columnId)
          const col = COLUMN_DEFINITIONS.find((c) => c.id === columnId)
          if (col?.filterParam) {
            if (col.filterType === 'yearRange') {
              clearFilter('start_year')
              clearFilter('end_year')
            } else {
              clearFilter(col.filterParam as FilterParamKey)
            }
          }
        } else {
          next.add(columnId)
        }
        const toggleable = [...next].filter(
          (id) => !DEFAULT_VISIBLE_COLUMNS.has(id)
        )
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toggleable))
        return next
      })
    },
    [clearFilter]
  )

  const handleResetColumns = useCallback(() => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const currentSort =
    filters.sort_by || (filters.keyword ? 'default' : 'citing_entities_desc')

  const columns = COLUMN_DEFINITIONS.filter((col) => visibleColumns.has(col.id))

  const getFilterOptions = (columnId: string) => {
    switch (columnId) {
      case 'organ':
        return organsData.map((o) => ({ value: o.short, count: undefined }))
      case 'entity_list':
        return entitiesData.map((e) => ({
          value: e.entity,
          count: undefined,
        }))
      case 'subjects':
        return filterOptions.subjects
      case 'programme':
        return filterOptions.programmes
      case 'document_type':
        return filterOptions.documentTypes
      case 'agenda_item':
        return filterOptions.agendaItems
      case 'budget_document':
        return filterOptions.budgetDocuments.map((d) => ({
          value: d.slug,
          count: undefined,
        }))
      default:
        return undefined
    }
  }

  const isColumnLocked = (columnId: string) => {
    if (columnId === 'entity_list' && pageType === 'entity') return true
    if (columnId === 'organ' && pageType === 'organ') return true
    return false
  }

  const findOrganLong = (short: string) =>
    organsData.find((o) => o.short === short)?.long || short

  const handleRowClick = (mandate: Mandate, e: React.MouseEvent) => {
    e.preventDefault()
    sessionStorage.setItem('mandateReturnUrl', window.location.href)
    window.open(getMandateUrl(mandate.full_document_symbol), '_blank')
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-2 flex items-center justify-end">
        <ColumnPicker
          visibleColumns={visibleColumns}
          onToggle={handleToggleColumn}
          onReset={handleResetColumns}
        />
      </div>

      {/* Table */}
      <div
        className={`rounded-lg border border-gray-200 overflow-hidden transition-opacity duration-150 ${isPending ? 'opacity-50' : 'opacity-100'}`}
      >
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-gray-50 hover:bg-gray-50">
                {columns.map((col) => (
                  <TableHead
                    key={col.id}
                    className={`${col.widthClass} ${col.minWidthClass || ''} ${col.align === 'right' ? 'text-right' : ''} h-10 px-3 text-[10px] font-medium tracking-wider uppercase text-gray-400`}
                  >
                    <ColumnHeaderFilter
                      column={col}
                      currentSort={currentSort}
                      filterOptions={getFilterOptions(col.id)}
                      yearRange={filterOptions.yearRange}
                      locked={isColumnLocked(col.id)}
                    />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {mandates.map((mandate) => (
                <TableRow
                  key={mandate.full_document_symbol}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                  onClick={(e) => handleRowClick(mandate, e)}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      className={`${col.align === 'right' ? 'text-right' : ''} overflow-hidden px-3 py-2 align-top text-sm`}
                    >
                      <CellContent
                        columnId={col.id}
                        mandate={mandate}
                        entitiesData={entitiesData}
                        findOrganLong={findOrganLong}
                        budgetDocuments={filterOptions.budgetDocuments}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
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
    </div>
  )
}

function CellContent({
  columnId,
  mandate,
  entitiesData,
  findOrganLong,
  budgetDocuments,
}: {
  columnId: string
  mandate: Mandate
  entitiesData: Entity[]
  findOrganLong: (short: string) => string
  budgetDocuments: BudgetDocument[]
}) {
  switch (columnId) {
    case 'symbol': {
      const symbol = mandate.full_document_symbol
      const highlighted =
        mandate.highlightedFields?.full_document_symbol
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
            <span>{mandate.body}</span>
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
      const entities = (mandate.entities || [])
        .filter((e) => e !== null)
        .sort()
      if (entities.length === 0) return null
      const maxShow = 2
      const visible = entities.slice(0, maxShow)
      const remaining = entities.length - maxShow

      const pill = (entity: string) => (
        <Link
          key={entity}
          href={`/entity/${encodeURIComponent(entity)}`}
          prefetch={false}
          onClick={(e) => e.stopPropagation()}
        >
          <Badge
            variant="secondary"
            className="cursor-pointer border-0 bg-un-blue/75! text-[10px] font-bold whitespace-nowrap text-white! transition-colors hover:bg-un-blue/60!"
          >
            <EntityName
              entityName={entity}
              entityLong={
                entitiesData.find((e) => e.entity === entity)?.entity_long
              }
              showUnderline={false}
            />
          </Badge>
        </Link>
      )

      if (remaining <= 0) {
        return (
          <div className="flex items-center gap-1 overflow-hidden">
            {entities.map(pill)}
          </div>
        )
      }

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 overflow-hidden cursor-default">
              {visible.map(pill)}
              <span className="text-[10px] text-gray-400 shrink-0">
                +{remaining}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm bg-white border shadow-lg p-2">
            <div className="flex flex-wrap gap-1">
              {entities.map(pill)}
            </div>
          </TooltipContent>
        </Tooltip>
      )
    }

    case 'detail':
      return (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )

    case 'subjects': {
      const subjects = mandate.subject_headings || []
      if (subjects.length === 0) return null
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="max-w-[200px] overflow-hidden cursor-default">
              <div className="flex items-center gap-1">
                {subjects.map((s) => (
                  <span
                    key={s}
                    className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
                  >
                    {titleCase(s)}
                  </span>
                ))}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm bg-white border shadow-lg p-2">
            <div className="flex flex-wrap gap-1">
              {subjects.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
                >
                  {titleCase(s)}
                </span>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )
    }

    case 'programme':
      return mandate.programme ? (
        <span className="text-xs">{mandate.programme}</span>
      ) : null

    case 'budget_document': {
      if (!mandate.citation_info || mandate.citation_info.length === 0)
        return null
      const docs = [
        ...new Set(mandate.citation_info.map((c) => c.origin_document)),
      ]
      const matched = docs
        .map((doc) => {
          const bd = budgetDocuments.find((b) =>
            new RegExp(b.match_pattern).test(doc)
          )
          return bd?.display_name || doc
        })
        .filter((v, i, a) => a.indexOf(v) === i)
      return (
        <span className="text-xs">{matched.join(', ')}</span>
      )
    }

    case 'document_type':
      return mandate.type ? (
        <span className="text-xs">{mandate.type}</span>
      ) : null

    case 'agenda_item': {
      const items = mandate.agenda_item_titles || []
      if (items.length === 0) return null
      return (
        <div className="flex flex-wrap gap-1">
          {items.map((item, i) => (
            <span
              key={i}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700"
            >
              {item}
            </span>
          ))}
        </div>
      )
    }

    default:
      return null
  }
}
