'use client'

import { SearchInput } from './SearchInput'
import {
  X,
  SlidersHorizontal,
  Filter,
  HelpCircle,
  Search,
  Building,
  Landmark,
  Target,
  BookOpen,
  Calendar,
  Receipt,
} from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { AdvancedSearch } from './AdvancedSearch'
import { FilterBadge } from '@/components/FilterBadge'
import { EntityName } from './EntityName'
import { OrganName } from './OrganName'
import { titleCase } from 'title-case'
import { explainerTexts } from '@/lib/explainer-texts'
import { useFilters } from '@/contexts/FilterContext'
import { getBudgetDocumentDisplayName } from '@/lib/budget-documents'

interface Entity {
  entity: string
  entity_long: string
}

interface Organ {
  short: string
  long: string
}

interface FilterControlsProps {
  programmeOptions: { value: string; count: number }[]
  subjectOptions: { value: string; count: number }[]
  yearRange: { min: number; max: number } | null
  yearDistribution: { [year: string]: number }
  originalYearDistribution?: { [year: string]: number }
  showAdvancedSearch: boolean
  setShowAdvancedSearch: (show: boolean) => void
  entitiesData: Entity[]
  allOrgans: Organ[]
  // New props for implicit filter logic
  entityFilter?: string
  organFilter?: string
  pageType: 'main' | 'entity' | 'organ'
}

export function FilterControls({
  programmeOptions,
  subjectOptions,
  yearRange,
  yearDistribution,
  originalYearDistribution,
  showAdvancedSearch,
  setShowAdvancedSearch,
  entitiesData,
  allOrgans,
  entityFilter,
  organFilter,
  pageType,
}: FilterControlsProps) {
  const {
    filters,
    setFilter,
    setMultipleFilters,
    clearFilter,
    clearAllFilters,
  } = useFilters()

  const [openTooltip, setOpenTooltip] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState(filters.keyword || '')

  // Sync search input with filters when filters change externally (e.g., clear all)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional sync from external state
    setSearchInput(filters.keyword || '')
  }, [filters.keyword])

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.tooltip-container')) {
        setOpenTooltip(null)
      }
    }

    if (openTooltip) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openTooltip])

  const toggleTooltip = (tooltipId: string) => {
    setOpenTooltip(openTooltip === tooltipId ? null : tooltipId)
  }

  const handleSearch = () => {
    const trimmedValue = searchInput.trim()
    if (trimmedValue !== (filters.keyword || '').trim()) {
      setFilter('keyword', trimmedValue || undefined)
    }
  }

  const TooltipButton = ({
    tooltipId,
    ariaLabel,
    tooltipText,
  }: {
    tooltipId: string
    ariaLabel: string
    tooltipText: string
  }) => (
    <div className="tooltip-container relative">
      <button
        type="button"
        className="-ml-1 cursor-help touch-manipulation rounded-sm border-0 bg-transparent p-0 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-hidden"
        aria-label={ariaLabel}
        onClick={() => toggleTooltip(tooltipId)}
      >
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
      </button>
      {openTooltip === tooltipId && (
        <div className="absolute top-6 right-0 z-50 w-64 rounded-md border bg-popover p-3 text-sm text-popover-foreground">
          <p>{tooltipText}</p>
        </div>
      )}
    </div>
  )

  // Get filters that should be displayed as chips (context-aware)
  const getDisplayFilters = () => {
    const displayFilters = { ...filters }

    // Remove implicit filters based on page type and explicit filters
    if (
      pageType === 'entity' &&
      entityFilter &&
      displayFilters.entity === entityFilter
    ) {
      delete displayFilters.entity
    }
    if (
      pageType === 'organ' &&
      organFilter &&
      displayFilters.organ === organFilter
    ) {
      delete displayFilters.organ
    }

    // Remove pagination, sorting, and keyword from display (keyword is counted separately)
    delete displayFilters.page
    delete displayFilters.limit
    delete displayFilters.sort_by
    delete displayFilters.keyword

    return displayFilters
  }

  const displayFilters = getDisplayFilters()
  const hasFilters = Object.values(displayFilters).some(
    (value) => value && value !== 'all'
  )
  const hasSearch = filters.keyword && filters.keyword.trim().length > 0

  // Convert year range to display format
  const yearRangeDisplay =
    filters.start_year && filters.end_year
      ? `${filters.start_year}-${filters.end_year}`
      : null

  const handleYearRangeChange = (range: [number, number]) => {
    setMultipleFilters({
      start_year: range[0].toString(),
      end_year: range[1].toString(),
    })
  }

  const selectedYearRange: [number, number] | null =
    filters.start_year && filters.end_year
      ? [parseInt(filters.start_year), parseInt(filters.end_year)]
      : null

  return (
    <div className="">
      {/* Advanced Filters - Enhanced container (now above search bar) */}
      {showAdvancedSearch && (
        <div className="bg-white/50">
          <div className="p-6 pt-4">
            <AdvancedSearch
              programme={filters.programme || ''}
              subject={filters.subject || ''}
              budgetDocument={filters.budget_document || ''}
              onProgrammeChange={(value) => setFilter('programme', value)}
              onSubjectChange={(value) => setFilter('subject', value)}
              onBudgetDocumentChange={(value) =>
                setFilter('budget_document', value)
              }
              programmeOptions={programmeOptions}
              subjectOptions={subjectOptions}
              yearRange={yearRange}
              yearDistribution={yearDistribution}
              originalYearDistribution={originalYearDistribution}
              selectedYearRange={selectedYearRange}
              onYearRangeChange={handleYearRangeChange}
            />
          </div>
        </div>
      )}
      {/* Search bar only in a row */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative grow">
          <SearchInput
            id="keyword-search"
            placeholder={explainerTexts.filters.keywordSearch.placeholder}
            value={searchInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchInput(e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSearch()
              }
            }}
            variant="border-bottom"
            showClearButton={true}
            onClear={() => {
              setSearchInput('')
              clearFilter('keyword')
            }}
          />
        </div>
      </div>

      {/* Filter Chips - Enhanced styling */}
      {(hasSearch || hasFilters) && (
        <div className="rounded-md border border-slate-200">
          <div className="p-6 pt-4">
            <div className="space-y-4">
              {/* Only show Active Filters label, count, and Clear All if there are visible chips or search */}
              {(hasSearch ||
                Object.values(displayFilters).filter((v) => v && v !== 'all')
                  .length > 0) && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Active Filters
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                      {(hasSearch ? 1 : 0) +
                        Object.values(displayFilters).filter(
                          (v) => v && v !== 'all'
                        ).length}
                    </span>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={clearAllFilters}
                    className="-mr-3 shrink-0 bg-trout text-white hover:bg-trout/90"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">Clear All</span>
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {hasSearch && (
                  <FilterBadge
                    icon={Search}
                    label={`"${filters.keyword}"`}
                    onClear={() => clearFilter('keyword')}
                    variant="secondary"
                  />
                )}

                {/* Entity chip - only show if not on entity page or if it's an additional filter */}
                {displayFilters.entity && displayFilters.entity !== 'all' && (
                  <FilterBadge
                    icon={Building}
                    label={
                      <>
                        Entity:&nbsp;
                        <EntityName
                          entityName={displayFilters.entity}
                          entityLong={
                            entitiesData.find(
                              (e) => e.entity === displayFilters.entity
                            )?.entity_long
                          }
                        />
                      </>
                    }
                    onClear={() => clearFilter('entity')}
                    variant="secondary"
                  />
                )}

                {/* Cross-citing Entity chip */}
                {displayFilters.crossCitingEntity &&
                  displayFilters.crossCitingEntity !== 'all' && (
                    <FilterBadge
                      icon={Building}
                      label={
                        <>
                          Cross-citing Entity:&nbsp;
                          <EntityName
                            entityName={displayFilters.crossCitingEntity}
                            entityLong={
                              entitiesData.find(
                                (e) =>
                                  e.entity === displayFilters.crossCitingEntity
                              )?.entity_long
                            }
                          />
                        </>
                      }
                      onClear={() => clearFilter('crossCitingEntity')}
                      variant="secondary"
                    />
                  )}

                {/* Organ chip - only show if not on organ page or if it's an additional filter */}
                {displayFilters.organ && displayFilters.organ !== 'all' && (
                  <FilterBadge
                    icon={Landmark}
                    label={
                      <>
                        Organ:&nbsp;
                        <OrganName
                          organName={displayFilters.organ}
                          allOrgans={allOrgans}
                        />
                      </>
                    }
                    onClear={() => clearFilter('organ')}
                    variant="secondary"
                  />
                )}

                {displayFilters.programme && (
                  <FilterBadge
                    icon={Target}
                    label={`Programme: ${displayFilters.programme}`}
                    onClear={() => clearFilter('programme')}
                    variant="secondary"
                  />
                )}

                {displayFilters.subject && (
                  <FilterBadge
                    icon={BookOpen}
                    label={`Subject: ${titleCase(displayFilters.subject)}`}
                    onClear={() => clearFilter('subject')}
                    variant="secondary"
                  />
                )}

                {yearRangeDisplay && (
                  <FilterBadge
                    icon={Calendar}
                    label={`Year: ${yearRangeDisplay}`}
                    onClear={() => {
                      clearFilter('start_year')
                      clearFilter('end_year')
                    }}
                    variant="secondary"
                  />
                )}

                {displayFilters.budget_document &&
                  displayFilters.budget_document !== 'all' && (
                    <FilterBadge
                      icon={Receipt}
                      label={`Budget: ${getBudgetDocumentDisplayName(displayFilters.budget_document)}`}
                      onClear={() => clearFilter('budget_document')}
                      variant="secondary"
                    />
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
