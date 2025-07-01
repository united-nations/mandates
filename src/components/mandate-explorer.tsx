'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Mandate } from '@/types'
import { MandateList } from '@/components/mandate-list'
import { FilterControls } from '@/components/filter-controls'
import { PaginationControls } from '@/components/pagination-controls'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Landmark, Building, Target, Quote } from 'lucide-react'
import { MandateDetails } from '@/components/mandate-details'
import { SearchResultsSummary } from '@/components/search-results-summary'
import { DataCard } from '@/components/data-card'
import { CrossCitations } from '@/components/cross-citations'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { SearchableDropdownOption } from '@/components/ui/searchable-dropdown'
import { explainerTexts } from '@/lib/explainer-texts'
import { CollapsibleSidebars } from '@/components/collapsible-sidebars'

interface Entity {
  entity: string
  entity_long: string
}

interface EntityWithCount {
  name: string
  count: number
}

interface BodyWithCount {
  name: string
  count: number
}

interface Organ {
  short: string
  long: string
}

interface MandateExplorerProps {
  // Optional pre-set entity filter
  presetEntity?: string
  // Optional pre-set organ filter
  presetOrgan?: string
  // Whether to show the entity data card (false for entity-specific views)
  showEntityCard?: boolean
  // Additional CSS classes
  className?: string
  // Custom title for the mandate list section
  mandateListTitle?: string
  // Optional sidebar components for entities and organs
  entityListSidebar?: React.ReactNode
  organListSidebar?: React.ReactNode
  // Whether to show the cross-citations section (false for entity detail pages)
  showCrossCitations?: boolean
  // Custom cross-citations sidebar for overlays
  crossCitationsSidebar?: React.ReactNode
  // Handlers for collapsible sidebars
  onEntityClick?: (entityName: string) => void
  onOrganClick?: (organName: string) => void
}

export function MandateExplorer ({
  presetEntity,
  presetOrgan,
  showEntityCard = true,
  className = '',
  mandateListTitle,
  entityListSidebar,
  organListSidebar,
  showCrossCitations = true,
  crossCitationsSidebar,
  onEntityClick,
  onOrganClick
}: MandateExplorerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [mandates, setMandates] = useState<Mandate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const currentPage = Number(searchParams.get('page') || '1')
  const pageSize = Number(searchParams.get('limit') || '10')
  const selectedEntity = presetEntity || searchParams.get('entity') || ''
  const selectedOrgan = presetOrgan || searchParams.get('organ') || ''
  const keywordFromParams = searchParams.get('keyword') || ''
  const programme = searchParams.get('programme') || ''
  const subject = searchParams.get('subject') || ''
  const startYearFromParams = searchParams.get('start_year')
  const endYearFromParams = searchParams.get('end_year')
  const budgetDocument = searchParams.get('budget_document') || ''
  const crossEntity = searchParams.get('cross_entity') || ''
  const sortBy =
    searchParams.get('sort_by') ||
    (keywordFromParams ? 'default' : 'citing_entities_desc')

  const [keyword, setKeyword] = useState(keywordFromParams)

  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)

  const [uniqueOrgans, setUniqueOrgans] = useState(0)
  const [uniqueEntities, setUniqueEntities] = useState(0)
  const [totalCitations, setTotalCitations] = useState(0)

  const [allEntities, setAllEntities] = useState<Entity[]>([])
  const [allOrgans, setAllOrgans] = useState<Organ[]>([])
  const [entityOptions, setEntityOptions] = useState<EntityWithCount[]>([])
  const [organOptions, setOrganOptions] = useState<BodyWithCount[]>([])
  const [programmeOptions, setProgrammeOptions] = useState<string[]>([])
  const [subjectOptions, setSubjectOptions] = useState<string[]>([])

  const [yearDistribution, setYearDistribution] = useState<{
    [year: string]: number
  }>({})
  const [yearRange, setYearRange] = useState<{
    min: number
    max: number
  } | null>(null)
  const [selectedYearRange, setSelectedYearRange] = useState<
    [number, number] | null
  >(null)

  const [selectedMandate, setSelectedMandate] = useState<Mandate | null>(null)

  const [sourceDocumentsPopover, setSourceDocumentsPopover] = useState(false)
  const [unOrgansPopover, setUnOrgansPopover] = useState(false)
  const [unEntitiesPopover, setUnEntitiesPopover] = useState(false)
  const [citationsPopover, setCitationsPopover] = useState(false)

  useEffect(() => {
    // Sync selectedYearRange with URL params when they change
    if (yearRange) {
      const startYear = startYearFromParams
        ? parseInt(startYearFromParams, 10)
        : yearRange.min
      const endYear = endYearFromParams
        ? parseInt(endYearFromParams, 10)
        : yearRange.max
      setSelectedYearRange([startYear, endYear])
    }
  }, [startYearFromParams, endYearFromParams, yearRange])

  useEffect(() => {
    async function fetchAllEntities () {
      try {
        const res = await fetch('/api/entities')
        if (res.ok) {
          const data = await res.json()
          setAllEntities(data)
        }
      } catch (error) {
        console.error('Failed to fetch all entities:', error)
      }
    }
    fetchAllEntities()
  }, [])

  useEffect(() => {
    async function fetchAllOrgans () {
      try {
        const res = await fetch('/api/organs')
        if (res.ok) {
          const data = await res.json()
          setAllOrgans(data)
        }
      } catch (error) {
        console.error('Failed to fetch organs data:', error)
      }
    }
    fetchAllOrgans()
  }, [])

  useEffect(() => {
    async function fetchMetadata () {
      try {
        const response = await fetch('/api/mandates/meta')
        const data = await response.json()
        setEntityOptions(data.uniqueEntities || [])
        setOrganOptions(data.uniqueBodiesWithCount || [])
        setSubjectOptions(data.uniqueSubjects || [])

        if (data.yearRange) {
          setYearRange(data.yearRange)
          const startYear = startYearFromParams
            ? parseInt(startYearFromParams, 10)
            : data.yearRange.min
          const endYear = endYearFromParams
            ? parseInt(endYearFromParams, 10)
            : data.yearRange.max
          setSelectedYearRange([startYear, endYear])
        }
        if (data.yearDistribution) {
          setYearDistribution(data.yearDistribution)
        }

        // Set initial summary stats for the whole dataset
        // Only set these if we're not filtering by a preset entity/organ
        // to avoid flickering on entity/organ detail pages
        if (!presetEntity && !presetOrgan) {
          setTotalItems(data.totalDocuments || 0)
          setUniqueOrgans(data.uniqueBodiesCount || 0)
          setUniqueEntities(data.totalEntities || 0)
          setTotalCitations(data.totalCitations || 0)
        }
      } catch (error) {
        console.error('Failed to fetch metadata:', error)
      }
    }
    fetchMetadata()
  }, [])

  const fetchMandates = useCallback(async () => {
    setIsLoading(true)
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(pageSize)
    })
    if (selectedEntity) params.append('entity', selectedEntity)
    if (selectedOrgan) params.append('organ', selectedOrgan)
    if (keywordFromParams) params.append('keyword', keywordFromParams)
    if (programme) params.append('programme', programme)
    if (subject) params.append('subject', subject)
    if (startYearFromParams) params.append('start_year', startYearFromParams)
    if (endYearFromParams) params.append('end_year', endYearFromParams)
    if (budgetDocument) params.append('budget_document', budgetDocument)
    if (crossEntity) params.append('cross_entity', crossEntity)
    if (sortBy && sortBy !== 'default') {
      params.append('sort_by', sortBy)
    }

    try {
      const response = await fetch(`/api/mandates?${params.toString()}`)
      const data = await response.json()
      setMandates(data.items || [])
      setTotalItems(data.totalItems || 0)
      setTotalPages(data.totalPages || 0)

      // Update summary stats with filtered results
      setUniqueOrgans(data.uniqueBodiesCount || 0)
      setUniqueEntities(data.uniqueEntitiesCount || 0)
      setTotalCitations(data.totalCitations || 0)

      if (data.uniqueProgrammes) {
        setProgrammeOptions(data.uniqueProgrammes)
      }
    } catch (error) {
      console.error('Failed to fetch mandates:', error)
    } finally {
      setIsLoading(false)
    }
  }, [
    currentPage,
    pageSize,
    selectedEntity,
    selectedOrgan,
    keywordFromParams,
    programme,
    subject,
    startYearFromParams,
    endYearFromParams,
    budgetDocument,
    crossEntity,
    sortBy
  ])

  useEffect(() => {
    fetchMandates()
  }, [fetchMandates])

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handlePageSizeChange = (size: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', String(size))
    params.set('page', '1') // Reset to page 1
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1') // Reset to page 1
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleYearRangeChange = (newRange: [number, number]) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('start_year', String(newRange[0]))
    params.set('end_year', String(newRange[1]))
    params.set('page', '1') // Reset to page 1
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleSortChange = (value: string) => {
    handleFilterChange('sort_by', value)
  }

  const onEntityChange = (value: string) => handleFilterChange('entity', value)
  const onOrganChange = (value: string) => handleFilterChange('organ', value)
  const onProgrammeChange = (value: string) =>
    handleFilterChange('programme', value)
  const onSubjectChange = (value: string) =>
    handleFilterChange('subject', value)
  const onBudgetDocumentChange = (value: string) =>
    handleFilterChange('budget_document', value)

  const onKeywordChange = (value: string) => {
    setKeyword(value)
  }

  const onKeywordSearch = (searchTerm: string = keyword) => {
    const params = new URLSearchParams(searchParams.toString())
    if (searchTerm) {
      params.set('keyword', searchTerm)
    } else {
      params.delete('keyword')
    }
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const LoadingSkeleton = () => (
    <div className='space-y-4'>
      <Skeleton className='h-8 w-3/4' />
      <Skeleton className='h-24 w-full' />
      <Skeleton className='h-24 w-full' />
      <Skeleton className='h-24 w-full' />
    </div>
  )

  const findOrganData = (organName: string): Organ | undefined => {
    return allOrgans.find(
      organ => organ.short === organName || organ.long === organName
    )
  }

  const getEntityLongName = (entityShortName: string) => {
    return allEntities.find(e => e.entity === entityShortName)?.entity_long
  }

  const entityDropdownOptions: SearchableDropdownOption[] = entityOptions.map(
    entity => ({
      value: entity.name,
      label: `${getEntityLongName(entity.name) || entity.name} (${
        entity.count
      })`
    })
  )

  const organDropdownOptions: SearchableDropdownOption[] = organOptions.map(
    organ => ({
      value: organ.name,
      label: `${findOrganData(organ.name)?.long || organ.name} (${organ.count})`
    })
  )

  const budgetDocumentDisplayNames: { [key: string]: string } = {
    ppb: 'Programme Plan & Budget',
    regular_budget: 'Regular Budget'
  }

  const dataCardsSection = (
    <>
      <DataCard
        title={explainerTexts.dataCards.sourceDocuments.title}
        value={totalItems}
        icon={FileText}
        description={explainerTexts.dataCards.sourceDocuments.description}
        isOpen={sourceDocumentsPopover}
        onOpenChange={setSourceDocumentsPopover}
        isLoading={isLoading}
      />
      <DataCard
        title={explainerTexts.dataCards.unOrgans.title}
        value={uniqueOrgans}
        icon={Landmark}
        description={explainerTexts.dataCards.unOrgans.description}
        isOpen={unOrgansPopover}
        onOpenChange={setUnOrgansPopover}
        isLoading={isLoading}
      />
      <DataCard
        title={explainerTexts.dataCards.unEntities.title}
        value={uniqueEntities}
        icon={Building}
        description={explainerTexts.dataCards.unEntities.description}
        isOpen={unEntitiesPopover}
        onOpenChange={setUnEntitiesPopover}
        isLoading={isLoading}
      />
      <DataCard
        title={explainerTexts.dataCards.citations.title}
        value={totalCitations}
        icon={Quote}
        description={explainerTexts.dataCards.citations.description}
        isOpen={citationsPopover}
        onOpenChange={setCitationsPopover}
        isLoading={isLoading}
      />
    </>
  )

  return (
    <div className={className}>
      {/* Summary Cards */}
      <section
        aria-labelledby='summary-heading'
        className='grid grid-cols-2 lg:grid-cols-4 gap-4'
      >
        {dataCardsSection}
      </section>

      <div>
        <div className='mt-6 pt-4'>
          {/* Collapsible sidebars for smaller screens - only show on main page */}
          {(entityListSidebar || organListSidebar) &&
            !presetEntity &&
            !presetOrgan && (
                             <CollapsibleSidebars
                 onEntityClick={onEntityClick || (() => {})}
                 onOrganClick={onOrganClick || (() => {})}
               />
            )}
          
          {/* Main content with mandates list, cross-citations, and sidebars */}
          <div className='flex flex-col lg:flex-row gap-6'>
            {/* Main mandates content */}
            <div className='flex-1 min-w-0'>
              <div className="flex items-center mb-3 gap-3">
                <h2 className='text-2xl font-bold tracking-tight'>
                  {mandateListTitle || explainerTexts.dataCards.sectionTitle}
                </h2>
                {/* Detail page subtitle: cited by/issued by */}
                {((presetEntity && !presetOrgan) ||
                  (presetOrgan && !presetEntity)) && (
                  <span className='text-sm text-muted-foreground font-medium'>
                    {presetEntity && !presetOrgan && (
                      <>
                        cited by{' '}
                        <span className='font-semibold'>{presetEntity}</span>
                      </>
                    )}
                    {presetOrgan && !presetEntity && (
                      <>
                        issued by{' '}
                        <span className='font-semibold'>{presetOrgan}</span>
                      </>
                    )}
                  </span>
                )}
              </div>
              <div className='flex flex-col lg:flex-row gap-6'>
                {/* Mandates List */}
                <div className='flex-1'>
                  <div className='mb-6'>
                    <div className='mb-4'>
                      <FilterControls
                        keyword={keyword}
                        onKeywordChange={onKeywordChange}
                        onKeywordSearch={onKeywordSearch}
                        entityOptions={entityDropdownOptions}
                        selectedEntity={selectedEntity}
                        onEntityChange={onEntityChange}
                        organOptions={organDropdownOptions}
                        selectedOrgan={selectedOrgan}
                        onOrganChange={onOrganChange}
                        programme={programme}
                        subject={subject}
                        yearRange={yearRange}
                        yearDistribution={yearDistribution}
                        selectedYearRange={selectedYearRange}
                        budgetDocument={budgetDocument}
                        onProgrammeChange={onProgrammeChange}
                        onSubjectChange={onSubjectChange}
                        onYearRangeChange={handleYearRangeChange}
                        onBudgetDocumentChange={onBudgetDocumentChange}
                        programmeOptions={programmeOptions}
                        subjectOptions={subjectOptions}
                        appliedFilters={{
                          entity:
                            selectedEntity !== 'all'
                              ? selectedEntity
                              : undefined,
                          organ:
                            selectedOrgan !== 'all' ? selectedOrgan : undefined,
                          programme: programme || undefined,
                          subject: subject || undefined,
                          year:
                            startYearFromParams &&
                            endYearFromParams &&
                            yearRange &&
                            (parseInt(startYearFromParams, 10) !==
                              yearRange.min ||
                              parseInt(endYearFromParams, 10) !== yearRange.max)
                              ? `${startYearFromParams}-${endYearFromParams}`
                              : undefined,
                          budget_document:
                            budgetDocument && budgetDocument !== 'all'
                              ? budgetDocumentDisplayNames[budgetDocument]
                              : undefined,
                          cross_entity: crossEntity || undefined
                        }}
                        onClearFilter={filterKey => {
                          switch (filterKey) {
                            case 'entity':
                              onEntityChange('all')
                              break
                            case 'organ':
                              onOrganChange('all')
                              break
                            case 'programme':
                              onProgrammeChange('')
                              break
                            case 'subject':
                              onSubjectChange('')
                              break
                            case 'year':
                              const newParams = new URLSearchParams(
                                searchParams.toString()
                              )
                              newParams.delete('start_year')
                              newParams.delete('end_year')
                              newParams.set('page', '1')
                              router.push(
                                `${pathname}?${newParams.toString()}`,
                                { scroll: false }
                              )
                              break
                            case 'budget_document':
                              onBudgetDocumentChange('all')
                              break
                            case 'cross_entity':
                              const crossEntityParams = new URLSearchParams(
                                searchParams.toString()
                              )
                              crossEntityParams.delete('cross_entity')
                              crossEntityParams.set('page', '1')
                              router.push(
                                `${pathname}?${crossEntityParams.toString()}`,
                                { scroll: false }
                              )
                              break
                          }
                        }}
                        onClearSearch={() => {
                          onKeywordChange('')
                          onKeywordSearch('')
                        }}
                        hideImplicitFilterChip={!!presetEntity || !!presetOrgan}
                      />
                    </div>

                    <div className='flex items-center gap-2 w-fit'>
                      <label
                        htmlFor='sort-by'
                        className='text-sm font-medium text-nowrap'
                      >
                        Sort by
                      </label>
                      <Select value={sortBy} onValueChange={handleSortChange}>
                        <SelectTrigger className='w-[290px]' id='sort-by'>
                          <SelectValue
                            placeholder={explainerTexts.sorting.placeholder}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {keywordFromParams ? (
                            <SelectItem value='default'>
                              Search Relevance
                            </SelectItem>
                          ) : null}
                          <SelectItem value='citing_entities_desc'>
                            Number of citing entities (High to Low)
                          </SelectItem>
                          <SelectItem value='citing_entities_asc'>
                            Number of citing entities (Low to High)
                          </SelectItem>
                          <SelectItem value='citations_desc'>
                            Citations (High to Low)
                          </SelectItem>
                          <SelectItem value='citations_asc'>
                            Citations (Low to High)
                          </SelectItem>
                          <SelectItem value='year_desc'>
                            Year (Newest First)
                          </SelectItem>
                          <SelectItem value='year_asc'>
                            Year (Oldest First)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {isLoading ? (
                    <LoadingSkeleton />
                  ) : (
                    <>
                      <MandateList
                        mandates={mandates}
                        onMandateClick={setSelectedMandate}
                        organsData={allOrgans}
                      />
                      <div className='mt-4'>
                        <PaginationControls
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPageChange={handlePageChange}
                          pageSize={pageSize}
                          onPageSizeChange={handlePageSizeChange}
                          totalItems={totalItems}
                        />
                      </div>
                    </>
                  )}
                </div>
                {/* Render custom cross-citations sidebar if provided */}
                {crossCitationsSidebar && (
                  <div className='w-full lg:w-80 flex-shrink-0'>
                    {crossCitationsSidebar}
                  </div>
                )}
                {/* Cross-Citations Section - only show when there's a preset entity and not using custom sidebar */}
                {presetEntity && showCrossCitations && !crossCitationsSidebar && (
                  <div className='w-full lg:w-80 flex-shrink-0'>
                    <CrossCitations
                      currentEntity={presetEntity}
                      onEntityFilter={entity => {
                        // Add the selected entity as an additional filter
                        const params = new URLSearchParams(
                          searchParams.toString()
                        )
                        params.set('page', '1')
                        params.set('cross_entity', entity)
                        router.push(`${pathname}?${params.toString()}`, {
                          scroll: false
                        })
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Entity and Organ Lists Sidebar - only show on main page and larger screens */}
            {(entityListSidebar || organListSidebar) &&
              !presetEntity &&
              !presetOrgan && (
                <div className='hidden lg:block lg:w-80 flex-shrink-0 space-y-6'>
                  {entityListSidebar}
                  {organListSidebar}
                </div>
              )}
          </div>
        </div>
      </div>

      <MandateDetails
        mandate={selectedMandate}
        open={!!selectedMandate}
        onOpenChange={isOpen => {
          if (!isOpen) {
            setSelectedMandate(null)
          }
        }}
        allEntities={allEntities}
      />
    </div>
  )
}
