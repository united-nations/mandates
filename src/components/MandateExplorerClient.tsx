'use client'

/**
 * MandateExplorerClient - Client component for mandate exploration
 *
 * This component handles all interactive UI elements:
 * - Filter controls and search
 * - Sort selection
 * - Pagination (via URL)
 * - Sidebar navigation
 *
 * Data is passed as props from the Server Component parent.
 * URL changes trigger server-side re-render with new data.
 */

import { DataCard } from '@/components/DataCard'
import { FilterControls } from '@/components/FilterControls'
import { MandateList } from '@/components/MandateList'
import { PaginationControls } from '@/components/PaginationControls'
import { SidebarAccordion } from '@/components/SidebarAccordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { explainerTexts } from '@/lib/en_text_contents'
import type { ApiResponse } from '@/types'
import {
  Building,
  ChevronDown,
  ChevronUp,
  FileText,
  Landmark,
  Link as LinkIcon,
  Quote,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'

import { OrganListSidebar } from '@/components/Sidebar0rganList'
import { CrossCitationsSidebar } from '@/components/SidebarCrossCitations'
import { EntityListSidebar } from '@/components/SidebarEntityList'
import { ModeToggle } from '@/components/ModeToggle'
import { Button } from '@/components/ui/button'
import { useFilters } from '@/contexts/FilterContext'
import type { DataMode } from '@/types'

interface MandateExplorerClientProps {
  /** Pre-fetched data from Server Component */
  data: ApiResponse
  /** Explicit entity filter for entity pages */
  entityFilter?: string
  /** Explicit organ filter for organ pages */
  organFilter?: string
  /** Page type for conditional rendering */
  pageType: 'main' | 'entity' | 'organ'
}

export function MandateExplorerClient({
  data,
  entityFilter,
  organFilter,
  pageType,
}: MandateExplorerClientProps) {
  const { filters, setFilter } = useFilters()
  const searchParams = useSearchParams()

  // UI state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)

  // Data card popover states
  const [sourceDocumentsPopover, setSourceDocumentsPopover] = useState(false)
  const [unOrgansPopover, setUnOrgansPopover] = useState(false)
  const [unEntitiesPopover, setUnEntitiesPopover] = useState(false)
  const [citationsPopover, setCitationsPopover] = useState(false)

  // Get current values from URL
  const pageSize = parseInt(searchParams.get('limit') || '10', 10)
  const sortBy = searchParams.get('sort_by') || 'citing_entities_desc'

  // Handle sort change
  const handleSortChange = useCallback(
    (value: string) => {
      setFilter('sort_by', value)
    },
    [setFilter]
  )

  // Extract data from props
  const { mandates, pagination, counts, filterOptions, reference, sidebar } =
    data
  const mode: DataMode = data.mode ?? 'ppb'
  const allOrgans = reference?.organs || []
  const allEntities = reference?.entities || []
  const crossCitations = sidebar?.crossCitations || []

  // Data cards section — always 4 cards
  const dataCardsSection = (
    <>
      <DataCard
        title={explainerTexts.dataCards.sourceDocuments.title}
        value={counts.totalDocuments}
        icon={FileText}
        description={explainerTexts.dataCards.sourceDocuments.description}
        isOpen={sourceDocumentsPopover}
        onOpenChange={setSourceDocumentsPopover}
      />
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
      />
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
      />
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
      />
    </>
  )

  return (
    <div>
      {/* Summary Cards */}
      <section
        aria-labelledby="summary-heading"
        className="-mx-4 overflow-x-auto scroll-smooth sm:mx-0 sm:overflow-x-visible"
        style={{
          scrollSnapType: 'x mandatory',
          scrollPadding: '0 1rem',
        }}
      >
        <div className="flex min-w-max gap-4 px-4 sm:grid sm:min-w-0 sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
          {dataCardsSection}
        </div>
      </section>

      <div>
        <div className="mt-6 pt-4">
          {/* Collapsible sidebars for smaller screens */}
          {pageType === 'main' && (
            <SidebarAccordion
              items={[
                {
                  id: 'organs',
                  title: 'UN Organs',
                  icon: Landmark,
                  content: (
                    <OrganListSidebar
                      organs={sidebar?.organs || []}
                      allOrgans={allOrgans.map((organ) => ({
                        short: organ.short,
                        long: organ.long,
                        count: 0,
                      }))}
                      hideHeader={true}
                      borderless={true}
                      pageType="main"
                    />
                  ),
                },
                {
                  id: 'entities',
                  title: 'UN Entities',
                  icon: Building,
                  content: (
                    <EntityListSidebar
                      entities={sidebar?.entities || []}
                      allEntities={allEntities.map((entity) => ({
                        entity: entity.entity,
                        entity_long: entity.entity_long,
                        count: 0,
                      }))}
                      hideHeader={true}
                      borderless={true}
                      pageType="main"
                    />
                  ),
                },
              ]}
            />
          )}

          {/* Collapsible sidebars for entity pages */}
          {pageType === 'entity' && (
            <SidebarAccordion
              items={[
                {
                  id: 'organs',
                  title: 'UN Organs',
                  icon: Landmark,
                  content: (
                    <OrganListSidebar
                      organs={sidebar?.organs || []}
                      allOrgans={allOrgans}
                      pageType={pageType}
                      entityFilter={entityFilter}
                      hideHeader={true}
                      borderless={true}
                    />
                  ),
                },
                {
                  id: 'cross-citations',
                  title: 'Cross-Citations',
                  icon: LinkIcon,
                  content: (
                    <CrossCitationsSidebar
                      crossCitations={crossCitations}
                      allEntities={allEntities}
                      pageType={pageType}
                      entityFilter={entityFilter}
                      organFilter={organFilter}
                      hideHeader={true}
                      borderless={true}
                    />
                  ),
                },
              ]}
            />
          )}

          {/* Collapsible sidebars for organ pages */}
          {pageType === 'organ' && (
            <SidebarAccordion
              items={[
                {
                  id: 'entities',
                  title: 'UN Entities',
                  icon: Building,
                  content: (
                    <EntityListSidebar
                      entities={sidebar?.entities || []}
                      allEntities={allEntities}
                      pageType={pageType}
                      organFilter={organFilter}
                      hideHeader={true}
                      borderless={true}
                    />
                  ),
                },
              ]}
            />
          )}

          {/* Main content with mandates list and sidebars */}
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Main mandates content */}
            <div className="min-w-0 flex-1">
              {/* Section Title and Sort Controls + FilterControls */}
              <div className="mb-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-un-blue" />
                    <h2 className="text-2xl font-bold tracking-tight">
                      Documents
                      {pageType === 'entity' && <> · cited by {entityFilter}</>}
                      {pageType === 'organ' && <> · issued by {organFilter}</>}
                    </h2>
                    {/* Mode toggle — only on main page, inline with title */}
                    {pageType === 'main' && (
                      <ModeToggle currentMode={mode} />
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                      className="flex shrink-0 items-center gap-2 px-2 text-left whitespace-nowrap text-slate-600 hover:bg-transparent hover:text-slate-900"
                    >
                      <span className="text-sm font-medium">
                        {showAdvancedSearch
                          ? 'Hide Advanced Filters'
                          : 'Show Advanced Filters'}
                      </span>
                      {showAdvancedSearch ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Select value={sortBy} onValueChange={handleSortChange}>
                      <SelectTrigger className="w-20" id="sort-by">
                        Sort
                      </SelectTrigger>
                      <SelectContent align="end">
                        {filters.keyword ? (
                          <SelectItem value="default">
                            Search Relevance
                          </SelectItem>
                        ) : null}
                        <SelectItem value="citing_entities_desc">
                          Number of citing entities ↓
                        </SelectItem>
                        <SelectItem value="citing_entities_asc">
                          Number of citing entities ↑
                        </SelectItem>
                        <SelectItem value="citations_desc">
                          Citations ↓
                        </SelectItem>
                        <SelectItem value="citations_asc">
                          Citations ↑
                        </SelectItem>
                        <SelectItem value="year_desc">Year ↓</SelectItem>
                        <SelectItem value="year_asc">Year ↑</SelectItem>
                        <SelectItem value="title_asc">Title A→Z</SelectItem>
                        <SelectItem value="title_desc">Title Z→A</SelectItem>
                        <SelectItem value="word_count_desc">Length ↓</SelectItem>
                        <SelectItem value="word_count_asc">Length ↑</SelectItem>
                        <SelectItem value="similarity_desc">Similarity ↓</SelectItem>
                        <SelectItem value="similarity_asc">Similarity ↑</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <FilterControls
                  programmeOptions={filterOptions.programmes}
                  subjectOptions={filterOptions.subjects}
                  documentTypeOptions={filterOptions.documentTypes}
                  budgetDocuments={filterOptions.budgetDocuments}
                  yearRange={filterOptions.yearRange}
                  yearDistribution={filterOptions.yearDistribution}
                  showAdvancedSearch={showAdvancedSearch}
                  setShowAdvancedSearch={setShowAdvancedSearch}
                  entitiesData={allEntities}
                  allOrgans={allOrgans}
                  entityFilter={entityFilter}
                  organFilter={organFilter}
                  pageType={pageType}
                  mode={mode}
                />
              </div>
              <div className="flex flex-col gap-6 lg:flex-row">
                {/* Mandates List */}
                <div className="flex-1">
                  <div className="mb-6">
                    <MandateList
                      mandates={mandates}
                      organsData={allOrgans}
                      entitiesData={allEntities}
                    />
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
              </div>
            </div>

            {/* Right sidebar */}
            <div className="hidden shrink-0 space-y-6 lg:block lg:w-80">
              {pageType === 'entity' && (
                <>
                  <OrganListSidebar
                    organs={sidebar?.organs || []}
                    allOrgans={allOrgans}
                    pageType={pageType}
                    entityFilter={entityFilter}
                  />
                  <CrossCitationsSidebar
                    crossCitations={crossCitations}
                    allEntities={allEntities}
                    pageType={pageType}
                    entityFilter={entityFilter}
                    organFilter={organFilter}
                  />
                </>
              )}

              {pageType === 'organ' && (
                <EntityListSidebar
                  entities={sidebar?.entities || []}
                  allEntities={allEntities}
                  pageType={pageType}
                  organFilter={organFilter}
                />
              )}

              {pageType === 'main' && (
                <>
                  <OrganListSidebar
                    organs={sidebar?.organs || []}
                    allOrgans={allOrgans}
                    pageType={pageType}
                  />
                  <EntityListSidebar
                    entities={sidebar?.entities || []}
                    allEntities={allEntities}
                    pageType={pageType}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
