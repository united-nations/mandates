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
import type { Entity, Mandate, Organ } from '@/types'
import { ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { titleCase } from 'title-case'
import { EntityName } from '../EntityName'
import { ColumnHeaderFilter } from './ColumnHeaderFilter'
import {
  COLUMN_DEFINITIONS,
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
  visibleColumns: Set<string>
}

export function MandateDataTable({
  mandates,
  organsData,
  entitiesData,
  filterOptions,
  visibleColumns,
}: MandateDataTableProps) {
  const { filters, setFilter, isPending } = useFilters()
  const router = useRouter()

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

  const isColumnLocked = (_columnId: string) => {
    return false
  }

  const findOrganLong = (short: string) =>
    organsData.find((o) => o.short === short)?.long || short

  const handleRowClick = (mandate: Mandate, e: React.MouseEvent) => {
    e.preventDefault()
    router.push(getMandateUrl(mandate.full_document_symbol))
  }

  return (
    <div>
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
                        onEntityClick={(entity) => setFilter('entity', entity)}
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
  onEntityClick,
}: {
  columnId: string
  mandate: Mandate
  entitiesData: Entity[]
  findOrganLong: (short: string) => string
  budgetDocuments: BudgetDocument[]
  onEntityClick: (entity: string) => void
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
        <Badge
          key={entity}
          variant="secondary"
          className="cursor-pointer border-0 bg-un-blue/75! text-[10px] font-bold whitespace-nowrap text-white! transition-colors hover:bg-un-blue/60!"
          onClick={(e) => {
            e.stopPropagation()
            onEntityClick(entity)
          }}
        >
          <EntityName
            entityName={entity}
            entityLong={
              entitiesData.find((e) => e.entity === entity)?.entity_long
            }
            showUnderline={false}
          />
        </Badge>
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
