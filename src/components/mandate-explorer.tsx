'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Mandate } from '@/types'
import { MandateList } from '@/components/mandate-list'
import { FilterControls } from '@/components/filter-controls'
import { PaginationControls } from '@/components/pagination-controls'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Landmark, Building, Quote } from 'lucide-react'
import { MandateDetails } from '@/components/mandate-details'
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
import { useFilters } from '@/contexts/FilterContext'

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
  // Additional CSS classes
  className?: string
  // Optional sidebar components for entities and organs
  entityListSidebar?: React.ReactNode
  organListSidebar?: React.ReactNode
  // Whether to show the cross-citations section (false for entity detail pages)
  showCrossCitations?: boolean
  // Custom cross-citations sidebar for overlays
  crossCitationsSidebar?: React.ReactNode
}

export function MandateExplorer ({
  className = '',
  entityListSidebar,
  organListSidebar,
  showCrossCitations = true,
  crossCitationsSidebar
}: MandateExplorerProps) {
  const {
    filters,
    setFilter,
    isEntityPage,
    isOrganPage,
    isMainPage,
    currentEntityName,
    currentOrganName
  } = useFilters()

  const [mandates, setMandates] = useState<Mandate[]>([])
  const [isLoading, setIsLoading] = useState(true)
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

  const [selectedMandate, setSelectedMandate] = useState<Mandate | null>(null)

  const [sourceDocumentsPopover, setSourceDocumentsPopover] = useState(false)
  const [unOrgansPopover, setUnOrgansPopover] = useState(false)
  const [unEntitiesPopover, setUnEntitiesPopover] = useState(false)
  const [citationsPopover, setCitationsPopover] = useState(false)

  // Get current page and page size from filters
  const currentPage = Number(filters.page || '1')
  const pageSize = Number(filters.limit || '10')
  const sortBy =
    filters.sort_by || (filters.keyword ? 'default' : 'citing_entities_desc')

  // Ref to track current abort controller
  const abortControllerRef = useRef<AbortController | null>(null)

  // Reset data when page context changes to prevent stale data
  const prevPageContext = useRef({
    isEntityPage: false,
    isOrganPage: false,
    isMainPage: true,
    currentEntityName: '',
    currentOrganName: ''
  })

  useEffect(() => {
    const prev = prevPageContext.current
    const hasPageTypeChanged =
      prev.isEntityPage !== isEntityPage ||
      prev.isOrganPage !== isOrganPage ||
      prev.isMainPage !== isMainPage
    const hasEntityChanged = prev.currentEntityName !== currentEntityName
    const hasOrganChanged = prev.currentOrganName !== currentOrganName

    if (hasPageTypeChanged || hasEntityChanged || hasOrganChanged) {
      setTotalItems(0)
      setUniqueOrgans(0)
      setUniqueEntities(0)
      setTotalCitations(0)
      setTotalPages(0)
      setMandates([])
      setIsLoading(true)

      // Update ref
      prevPageContext.current = {
        isEntityPage,
        isOrganPage,
        isMainPage,
        currentEntityName: currentEntityName || '',
        currentOrganName: currentOrganName || ''
      }
    }
  }, [
    isEntityPage,
    isOrganPage,
    isMainPage,
    currentEntityName,
    currentOrganName
  ])

  // Fetch mandates whenever filters change
  const fetchMandates = useCallback(async () => {
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller for this request
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setIsLoading(true)
    try {
      const params = new URLSearchParams()

      // Add all filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.set(key, value)
        }
      })

      // Set defaults
      params.set('page', currentPage.toString())
      params.set('limit', pageSize.toString())
      params.set('sort_by', sortBy)

      const response = await fetch(`/api/mandates?${params.toString()}`, {
        signal: abortController.signal
      })

      // If request was aborted, don't process the response
      if (abortController.signal.aborted) {
        return
      }

      const data = await response.json()

      setMandates(data.items || [])
      setTotalPages(data.totalPages || 0)
      setTotalItems(data.totalItems || 0)
      setUniqueOrgans(data.metadata?.uniqueOrgans || 0)
      setUniqueEntities(data.metadata?.uniqueEntities || 0)
      setTotalCitations(data.metadata?.totalCitations || 0)

      if (data.metadata?.yearDistribution) {
        setYearDistribution(data.metadata.yearDistribution)
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      console.error('Failed to fetch mandates:', error)
    } finally {
      // Only set loading to false if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [filters, currentPage, pageSize, sortBy])

  useEffect(() => {
    fetchMandates()
  }, [fetchMandates])

  // Cleanup: abort any pending requests when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

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
        setProgrammeOptions(data.uniqueProgrammes || [])

        if (data.yearRange) {
          setYearRange(data.yearRange)
        }
        if (data.yearDistribution) {
          setYearDistribution(data.yearDistribution)
        }
      } catch (error) {
        console.error('Failed to fetch metadata:', error)
      }
    }
    fetchMetadata()
  }, [])

  const handlePageChange = (page: number) => {
    setFilter('page', page.toString())
  }

  const handlePageSizeChange = (size: number) => {
    setFilter('limit', size.toString())
    setFilter('page', '1') // Reset to first page
  }

  const handleSortChange = (value: string) => {
    setFilter('sort_by', value)
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
    return allEntities.find((e: any) => e['Entity'] === entityShortName)?.[
      'entity_long'
    ] as string | undefined
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
      {/* Always show organs card; on organ page show short name, else show count */}
      <DataCard
        title={
          isOrganPage
            ? 'UN Organ / Body'
            : explainerTexts.dataCards.unOrgans.title
        }
        value={isOrganPage ? currentOrganName || '' : uniqueOrgans}
        icon={Landmark}
        description={explainerTexts.dataCards.unOrgans.description}
        isOpen={unOrgansPopover}
        onOpenChange={setUnOrgansPopover}
        isLoading={isLoading && !isOrganPage}
      />
      {/* Always show entity card; on entity page show short name, else show count */}
      <DataCard
        title={
          isEntityPage ? 'Entity' : explainerTexts.dataCards.unEntities.title
        }
        value={isEntityPage ? currentEntityName || '' : uniqueEntities}
        icon={Building}
        description={explainerTexts.dataCards.unEntities.description}
        isOpen={unEntitiesPopover}
        onOpenChange={setUnEntitiesPopover}
        isLoading={isLoading && !isEntityPage}
      />
      <DataCard
        title={
          isEntityPage
            ? explainerTexts.dataCards.citationsByEntity.title
            : explainerTexts.dataCards.citations.title
        }
        value={totalCitations}
        icon={Quote}
        description={
          isEntityPage
            ? explainerTexts.dataCards.citationsByEntity.description
            : explainerTexts.dataCards.citations.description
        }
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
        className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`}
      >
        {dataCardsSection}
      </section>

      <div>
        <div className='mt-6 pt-4'>
          {/* Collapsible sidebars for smaller screens - show on main page and entity sidebar on organ page */}
          {isMainPage && <CollapsibleSidebars />}

          {/* Collapsible sidebars for entity/organ pages - show above main content */}
          {(isEntityPage || isOrganPage) && (
            <div className='lg:hidden mb-6 max-w-md'>
              {crossCitationsSidebar}
            </div>
          )}

          {/* Main content with mandates list, cross-citations, and sidebars */}
          <div className='flex flex-col lg:flex-row gap-6'>
            {/* Main mandates content */}
            <div className='flex-1 min-w-0'>
              {/* Section Title with Icon and Sort Controls + FilterControls */}
              <div className='mb-4'>
                <div className='flex items-center gap-3 justify-between flex-wrap mb-2'>
                  <div className='flex items-center gap-2'>
                    <FileText className='h-6 w-6 text-un-blue' />
                    <h2 className='text-2xl font-bold tracking-tight'>
                      {explainerTexts.dataCards.sectionTitle}
                      {/* Detail page title: cited by/issued by */}
                      {isEntityPage && <> cited by {currentEntityName}</>}
                      {isOrganPage && <> issued by {currentOrganName}</>}
                    </h2>
                  </div>
                  <div className='flex items-center gap-2 w-fit mt-2 sm:mt-0'>
                    <Select value={sortBy} onValueChange={handleSortChange}>
                      <SelectTrigger className='w-[80px]' id='sort-by'>
                        Sort
                      </SelectTrigger>
                      <SelectContent align='end'>
                        {filters.keyword ? (
                          <SelectItem value='default'>
                            Search Relevance
                          </SelectItem>
                        ) : null}
                        <SelectItem value='citing_entities_desc'>
                          Number of citing entities ↓
                        </SelectItem>
                        <SelectItem value='citing_entities_asc'>
                          Number of citing entities ↑
                        </SelectItem>
                        <SelectItem value='citations_desc'>
                          Citations ↓
                        </SelectItem>
                        <SelectItem value='citations_asc'>
                          Citations ↑
                        </SelectItem>
                        <SelectItem value='year_desc'>Year ↓</SelectItem>
                        <SelectItem value='year_asc'>Year ↑</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <FilterControls
                  entityOptions={entityDropdownOptions}
                  organOptions={organDropdownOptions}
                  programmeOptions={programmeOptions}
                  subjectOptions={subjectOptions}
                  yearRange={yearRange}
                  yearDistribution={yearDistribution}
                />
              </div>
              <div className='flex flex-col lg:flex-row gap-6'>
                {/* Mandates List */}
                <div className='flex-1'>
                  <div className='mb-6'>
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
                </div>
              </div>
            </div>

            <div className='hidden lg:block lg:w-80 flex-shrink-0 space-y-6'>
              {(isEntityPage || isOrganPage) && crossCitationsSidebar}
              {isMainPage && entityListSidebar}
              {isMainPage && organListSidebar}
            </div>
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
