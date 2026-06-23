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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useFilters } from '@/contexts/FilterContext'
import { explainerTexts } from '@/lib/en_text_contents'
import type { ApiResponse } from '@/types'
import { Building, ChevronDown, FileText, Landmark, Quote } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { MandateCompactList } from './table/MandateCompactList'
import { MandateDataTable } from './table/MandateDataTable'
import { useColumnVisibility } from './table/useColumnVisibility'
// import { YearBarCard } from './YearBarCard' // Years card hidden — see summary cards section

interface MandateExplorerClientProps {
  data: ApiResponse
}

export function MandateExplorerClient({
  data,
}: MandateExplorerClientProps) {
  const { filters, setFilter, setMultipleFilters } = useFilters()
  const searchParams = useSearchParams()

  const [sourceDocumentsPopover, setSourceDocumentsPopover] = useState(false)
  const [unOrgansPopover, setUnOrgansPopover] = useState(false)
  const [unEntitiesPopover, setUnEntitiesPopover] = useState(false)
  const [citationsPopover, setCitationsPopover] = useState(false)
  const [ppbDropdownOpen, setPpbDropdownOpen] = useState(false)
  const { visibleColumns, handleToggleColumn, handleResetColumns } =
    useColumnVisibility()

  const pageSize = parseInt(searchParams.get('limit') || '25', 10)
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

  const handleModeChange = useCallback(
    (value: string) => {
      setFilter('mode', value)
    },
    [setFilter]
  )

  const currentMode = filters.mode || 'active_mandates'

  // Versions are data-driven (ppb2026.budget_versions). The default comes from
  // is_default in the DB, not a hardcoded slug.
  const ppbVersions = (filterOptions.budgetVersions ?? []).map((v) => ({
    value: v.slug,
    short: `${v.ppb_year}`,
    long: v.display_name,
    isDefault: v.is_default,
  }))
  const defaultVersion =
    ppbVersions.find((v) => v.isDefault) ?? ppbVersions[0]
  const currentPpbVersion = filters.ppb_version || defaultVersion?.value
  const activePpb =
    ppbVersions.find((v) => v.value === currentPpbVersion) ?? defaultVersion

  const ppbDropdown = (
    <DropdownMenu open={ppbDropdownOpen} onOpenChange={setPpbDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-0.5 border-b border-current pb-px -mb-px"
          onClick={(e) => e.stopPropagation()}
        >
          {activePpb?.short ?? ''}
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {ppbVersions.map((v) => (
          <DropdownMenuItem
            key={v.value}
            onClick={() => setMultipleFilters({ mode: 'active_mandates', ppb_version: v.value })}
            className={`my-0.5 flex flex-col items-start gap-0.5 ${currentPpbVersion === v.value ? 'bg-accent' : ''}`}
          >
            <span className="font-medium">{v.short}</span>
            <span className="text-xs text-muted-foreground">{v.long}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const modeToggle = (
    <div className="inline-flex flex-wrap items-center rounded-md bg-muted p-0.5 whitespace-nowrap">
      <Tooltip open={ppbDropdownOpen ? false : undefined} key={ppbDropdownOpen ? 'dropdown-open' : 'dropdown-closed'}>
        <TooltipTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            onClick={() => { if (!ppbDropdownOpen) handleModeChange('active_mandates') }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleModeChange('active_mandates') }}
            className={`inline-flex h-7 grow cursor-pointer items-center gap-1 rounded-sm px-2.5 text-xs font-medium transition-all ${
              currentMode === 'active_mandates'
                ? 'bg-background text-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Cited Mandate Sources</span>
            {ppbDropdown}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          Documents cited by UN entities in the{' '}
          {activePpb?.long ?? 'proposed budget'}.
          Includes resolutions, decisions, conventions, and other formal
          documents with full citation data.
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => handleModeChange('all_resolutions')}
            className={`inline-flex h-7 grow items-center rounded-sm px-2.5 text-xs font-medium transition-all ${
              currentMode === 'all_resolutions'
                ? 'bg-background text-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Documents
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" collisionPadding={8} className="max-w-xs">
          ~42,000 resolutions, decisions and presidential statements of
          the General Assembly, Security Council, ECOSOC and Human Rights
          Council (Dag Hammarskjöld Library, 1946–present), plus any other
          documents cited in the latest proposed budget. Where a document
          is cited in a PPB, entity and citation data is available.
        </TooltipContent>
      </Tooltip>
    </div>
  )

  return (
    <div>
      {/* Summary Cards */}
      <section aria-labelledby="summary-heading" className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dataCardsSection}
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
          {/* Years card hidden — keep code for potential re-enable
          {filterOptions.yearRange && (
            <YearBarCard
              yearDistribution={filterOptions.yearDistributionUnfiltered ?? filterOptions.yearDistribution}
            />
          )}
          */}
        </div>
      </section>

      <div className="mt-6 pt-4">
        {/* Section Title and Sort (mobile) + FilterControls */}
        <div className="mb-4">
          <div className="mb-2">
            <h2 className="text-2xl font-bold tracking-tight">
              {explainerTexts.dataCards.sectionTitle}
            </h2>
          </div>
          <FilterControls
            entitiesData={allEntities}
            allOrgans={allOrgans}
            budgetDocuments={filterOptions.budgetDocuments}
            toolbarSlot={modeToggle}
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
            onToggleColumn={handleToggleColumn}
            onResetColumns={handleResetColumns}
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
