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
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { MandateCompactList } from './table/MandateCompactList'
import { MandateDataTable } from './table/MandateDataTable'
import { YearBarCard } from './YearBarCard'

interface MandateExplorerClientProps {
  data: ApiResponse
  entityFilter?: string
  organFilter?: string
  pageType: 'main' | 'entity' | 'organ'
}

export function MandateExplorerClient({
  data,
  entityFilter,
  organFilter,
  pageType,
}: MandateExplorerClientProps) {
  const { filters, setFilter, clearFilter } = useFilters()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [sourceDocumentsPopover, setSourceDocumentsPopover] = useState(false)
  const [unOrgansPopover, setUnOrgansPopover] = useState(false)
  const [unEntitiesPopover, setUnEntitiesPopover] = useState(false)
  const [citationsPopover, setCitationsPopover] = useState(false)

  const pageSize = parseInt(searchParams.get('limit') || '10', 10)
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

  // Build URL with current filters for navigation
  const buildPageUrl = (
    base: string,
    excludeKey: string
  ): string => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (key !== excludeKey && key !== 'page' && value && value !== 'all') {
        params.set(key, value)
      }
    })
    const qs = params.toString()
    return qs ? `${base}?${qs}` : base
  }

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
    if (pageType === 'main') {
      router.push(buildPageUrl(`/organ/${encodeURIComponent(organName)}`, 'organ'))
    } else {
      setFilter('organ', organName)
    }
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
    if (pageType === 'main') {
      router.push(buildPageUrl(`/entity/${encodeURIComponent(entityName)}`, 'entity'))
    } else {
      setFilter('entity', entityName)
    }
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
        activeFilterCount={filters.document_type ? 1 : 0}
      >
        <DocumentTypeSidebar documentTypes={documentTypes} />
      </DataCard>
      <DataCard
        title={
          pageType === 'organ'
            ? 'UN Organ / Body'
            : explainerTexts.dataCards.unOrgans.title
        }
        value={pageType === 'organ' ? organFilter || '' : counts.totalOrgans}
        icon={Landmark}
        description={explainerTexts.dataCards.unOrgans.description}
        isOpen={unOrgansPopover}
        onOpenChange={setUnOrgansPopover}
        previewItems={pageType === 'organ' ? undefined : organsPreview}
        totalItems={organs.length}
        activeFilterCount={filters.organ ? 1 : 0}
      >
        <PopoverFilterList
          items={organItems}
          onItemClick={handleOrganClick}
          searchPlaceholder="Search organs and bodies..."
          searchFilter={(item, term) =>
            item.key.toLowerCase().includes(term) ||
            (item.tooltipContent?.toLowerCase().includes(term) ?? false)
          }
          variant={pageType === 'main' ? 'navigation' : 'filter'}
          emptyMessage="No organs found"
        />
      </DataCard>
      <DataCard
        title={
          pageType === 'entity'
            ? 'Entity'
            : explainerTexts.dataCards.unEntities.title
        }
        value={
          pageType === 'entity' ? entityFilter || '' : counts.totalEntities
        }
        icon={Building}
        description={explainerTexts.dataCards.unEntities.description}
        isOpen={unEntitiesPopover}
        onOpenChange={setUnEntitiesPopover}
        previewItems={pageType === 'entity' ? undefined : entitiesPreview}
        totalItems={entities.length}
        activeFilterCount={
          filters.entity || filters.crossCitingEntity ? 1 : 0
        }
      >
        <PopoverFilterList
          items={entityItems}
          onItemClick={handleEntityClick}
          searchPlaceholder="Search entities..."
          searchFilter={(item, term) =>
            item.key.toLowerCase().includes(term) ||
            (item.tooltipContent?.toLowerCase().includes(term) ?? false)
          }
          variant={pageType === 'main' ? 'navigation' : 'filter'}
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
          {filterOptions.yearRange && (
            <div className="sm:col-span-2">
              <YearBarCard
                yearDistribution={filterOptions.yearDistributionUnfiltered ?? filterOptions.yearDistribution}
                yearRange={filterOptions.yearRange}
                activeFilterCount={
                  filters.start_year || filters.end_year ? 1 : 0
                }
              />
            </div>
          )}
          <DataCard
            title={
              pageType === 'entity'
                ? explainerTexts.dataCards.citationsByEntity.title
                : explainerTexts.dataCards.citations.title
            }
            value={counts.totalCitations}
            icon={Quote}
            description={
              pageType === 'entity'
                ? explainerTexts.dataCards.citationsByEntity.description
                : explainerTexts.dataCards.citations.description
            }
            isOpen={citationsPopover}
            onOpenChange={setCitationsPopover}
            previewItems={citationPreview}
            totalItems={citationBins.length}
            activeFilterCount={
              filters.min_citations || filters.max_citations ? 1 : 0
            }
          >
            <CitationDistribution bins={citationBins} />
          </DataCard>
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
                {pageType === 'entity' && <> cited by {entityFilter}</>}
                {pageType === 'organ' && <> issued by {organFilter}</>}
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
            entityFilter={entityFilter}
            organFilter={organFilter}
            pageType={pageType}
          />
        </div>

        {/* Data table (desktop) */}
        <div className="hidden lg:block">
          <MandateDataTable
            mandates={mandates}
            organsData={allOrgans}
            entitiesData={allEntities}
            filterOptions={filterOptions}
            pageType={pageType}
            entityFilter={entityFilter}
            organFilter={organFilter}
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
