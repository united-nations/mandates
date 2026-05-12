'use client'

import { DataCard } from '@/components/DataCard'
import { EntityName } from '@/components/EntityName'
import { FilterControls } from '@/components/FilterControls'
import { OrganName } from '@/components/OrganName'
import { PaginationControls } from '@/components/PaginationControls'
import { PopoverFilterList } from '@/components/PopoverFilterList'
import { CitationDistribution } from '@/components/SidebarCitationDistribution'
import { DocumentTypeSidebar } from '@/components/SidebarDocumentTypeList'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { useFilters } from '@/contexts/FilterContext'
import { explainerTexts } from '@/lib/en_text_contents'
import type { ApiResponse } from '@/types'
import { Building, FileText, Landmark, Quote } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { ColumnPicker } from './table/ColumnPicker'
import { MandateCompactList } from './table/MandateCompactList'
import { MandateDataTable } from './table/MandateDataTable'
import { useColumnVisibility } from './table/useColumnVisibility'
import { YearBarCard } from './YearBarCard'

interface MandateExplorerClientProps {
  data: ApiResponse
}

export function MandateExplorerClient({
  data,
}: MandateExplorerClientProps) {
  const { filters, setFilter, clearFilter } = useFilters()
  const searchParams = useSearchParams()

  const [sourceDocumentsPopover, setSourceDocumentsPopover] = useState(false)
  const [unOrgansPopover, setUnOrgansPopover] = useState(false)
  const [unEntitiesPopover, setUnEntitiesPopover] = useState(false)
  const [citationsPopover, setCitationsPopover] = useState(false)
  const { visibleColumns, handleToggleColumn, handleResetColumns } =
    useColumnVisibility()

  const pageSize = parseInt(searchParams.get('limit') || '25', 10)
  const sortBy =
    searchParams.get('sort_by') ||
    (filters.keyword ? 'default' : 'citing_entities_desc')

  const handleSortChange = useCallback(
    (value: string) => {
      if (value === 'default') {
        clearFilter('sort_by')
      } else {
        setFilter('sort_by', value)
      }
    },
    [setFilter, clearFilter]
  )

  const { mandates, pagination, counts, filterOptions, reference, sidebar } =
    data
  const allOrgans = reference?.organs || []
  const allEntities = reference?.entities || []

  // Preview items for mini bar charts on cards
  const organs = sidebar?.organs || []
  const entities = sidebar?.entities || []
  const documentTypes = filterOptions.documentTypes ?? []
  const citationBins = sidebar?.citationDistribution || []

  const docTypePreview = documentTypes
    .slice(0, 4)
    .map((d) => ({ name: d.value, count: d.count }))

  const organsPreview = organs
    .slice(0, 4)
    .map((o) => ({ name: o.short, count: o.count }))

  const entitiesPreview = entities
    .slice(0, 4)
    .map((e) => ({ name: e.entity, count: e.count }))

  const citationPreview = citationBins.map((b) => ({
    name: b.bin,
    count: b.count,
  }))

  // Organ popover items
  const organItems = organs.map((organ) => {
    const organData = allOrgans.find(
      (o) => o.short === organ.short || o.long === organ.short
    )
    return {
      key: organ.short,
      label: (
        <OrganName
          organName={organ.short}
          allOrgans={allOrgans}
          asChild={true}
        />
      ),
      count: organ.count,
      isActive: filters.organ === organ.short,
      tooltipContent:
        organData && organData.short !== organData.long
          ? organData.long
          : undefined,
    }
  })

  const handleOrganClick = (organName: string) => {
    setFilter('organ', organName)
  }

  // Entity popover items
  const entityItems = entities.map((entity) => {
    const entityData = allEntities.find((e) => e.entity === entity.entity)
    return {
      key: entity.entity,
      label: (
        <EntityName
          entityName={entity.entity}
          entityLong={entityData?.entity_long}
          asChild={true}
        />
      ),
      count: entity.count,
      isActive: filters.entity === entity.entity,
      tooltipContent:
        entityData?.entity_long && entityData.entity !== entityData.entity_long
          ? entityData.entity_long
          : undefined,
    }
  })

  const handleEntityClick = (entityName: string) => {
    setFilter('entity', entityName)
  }

  const dataCardsSection = (
    <>
      <DataCard
        title={explainerTexts.dataCards.sourceDocuments.title}
        value={counts.totalDocuments}
        icon={FileText}
        description={explainerTexts.dataCards.sourceDocuments.description}
        isOpen={sourceDocumentsPopover}
        onOpenChange={setSourceDocumentsPopover}
        previewItems={docTypePreview}
        totalItems={documentTypes.length}
      >
        <DocumentTypeSidebar documentTypes={documentTypes} />
      </DataCard>
      <DataCard
        title={explainerTexts.dataCards.unOrgans.title}
        value={counts.totalOrgans}
        icon={Landmark}
        description={explainerTexts.dataCards.unOrgans.description}
        isOpen={unOrgansPopover}
        onOpenChange={setUnOrgansPopover}
        previewItems={organsPreview}
        totalItems={organs.length}
      >
        <PopoverFilterList
          items={organItems}
          onItemClick={handleOrganClick}
          searchPlaceholder="Search organs and bodies..."
          searchFilter={(item, term) =>
            item.key.toLowerCase().includes(term) ||
            (item.tooltipContent?.toLowerCase().includes(term) ?? false)
          }
          variant="filter"
          emptyMessage="No organs found"
        />
      </DataCard>
      <DataCard
        title={explainerTexts.dataCards.unEntities.title}
        value={counts.totalEntities}
        icon={Building}
        description={explainerTexts.dataCards.unEntities.description}
        isOpen={unEntitiesPopover}
        onOpenChange={setUnEntitiesPopover}
        previewItems={entitiesPreview}
        totalItems={entities.length}
      >
        <PopoverFilterList
          items={entityItems}
          onItemClick={handleEntityClick}
          searchPlaceholder="Search entities..."
          searchFilter={(item, term) =>
            item.key.toLowerCase().includes(term) ||
            (item.tooltipContent?.toLowerCase().includes(term) ?? false)
          }
          variant="filter"
          emptyMessage="No entities found"
        />
      </DataCard>
    </>
  )

  return (
    <div>
      {/* Summary Cards */}
      <section aria-labelledby="summary-heading" className="space-y-4">
        <div
          className="-mx-4 overflow-x-auto scroll-smooth sm:mx-0 sm:overflow-x-visible"
          style={{
            scrollSnapType: 'x mandatory',
            scrollPadding: '0 1rem',
          }}
        >
          <div className="flex min-w-max gap-4 px-4 sm:grid sm:min-w-0 sm:grid-cols-3 sm:px-0">
            {dataCardsSection}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DataCard
            title={explainerTexts.dataCards.citations.title}
            value={counts.totalCitations}
            icon={Quote}
            description={explainerTexts.dataCards.citations.description}
            isOpen={citationsPopover}
            onOpenChange={setCitationsPopover}
            previewItems={citationPreview}
            totalItems={citationBins.length}
          >
            <CitationDistribution bins={citationBins} />
          </DataCard>
          {filterOptions.yearRange && (
            <YearBarCard
              yearDistribution={filterOptions.yearDistributionUnfiltered ?? filterOptions.yearDistribution}
            />
          )}
        </div>
      </section>

      <div className="mt-6 pt-4">
        {/* Section Title and Sort (mobile) + FilterControls */}
        <div className="mb-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-un-blue" />
              <h2 className="text-2xl font-bold tracking-tight">
                {explainerTexts.dataCards.sectionTitle}
              </h2>
            </div>
            <div className="ml-auto flex items-center gap-2 lg:hidden">
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger
                  className="w-auto gap-2 border-0 px-2 text-sm font-medium text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground [&_svg]:opacity-100"
                  id="sort-by"
                >
                  Sort
                </SelectTrigger>
                <SelectContent align="end">
                  {filters.keyword ? (
                    <SelectItem value="default">Search Relevance</SelectItem>
                  ) : null}
                  <SelectItem value="citing_entities_desc">
                    Number of citing entities ↓
                  </SelectItem>
                  <SelectItem value="citing_entities_asc">
                    Number of citing entities ↑
                  </SelectItem>
                  <SelectItem value="citations_desc">Citations ↓</SelectItem>
                  <SelectItem value="citations_asc">Citations ↑</SelectItem>
                  <SelectItem value="year_desc">Year ↓</SelectItem>
                  <SelectItem value="year_asc">Year ↑</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <FilterControls
            entitiesData={allEntities}
            allOrgans={allOrgans}
            budgetDocuments={filterOptions.budgetDocuments}
            toolbarSlot={
              <div className="hidden shrink-0 lg:block">
                <ColumnPicker
                  visibleColumns={visibleColumns}
                  onToggle={handleToggleColumn}
                  onReset={handleResetColumns}
                />
              </div>
            }
          />
        </div>

        {/* Data table (desktop) */}
        <div className="hidden lg:block">
          <MandateDataTable
            mandates={mandates}
            organsData={allOrgans}
            entitiesData={allEntities}
            filterOptions={filterOptions}
            visibleColumns={visibleColumns}
          />
        </div>

        {/* Compact list (mobile) */}
        <div className="block lg:hidden">
          <MandateCompactList
            mandates={mandates}
            organsData={allOrgans}
            entitiesData={allEntities}
          />
        </div>

        <div className="mt-4">
          <PaginationControls
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pageSize}
            totalItems={pagination.totalItems}
          />
        </div>
      </div>
    </div>
  )
}
