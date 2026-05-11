'use client'

import { SearchInput } from './SearchInput'
import {
  X,
  Search,
  Building,
  Landmark,
  Target,
  BookOpen,
  Calendar,
  Receipt,
  FileType,
  List,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AdvancedSearch } from './AdvancedSearch'
import { FilterBadge } from '@/components/FilterBadge'
import { EntityName } from './EntityName'
import { OrganName } from './OrganName'
import { titleCase } from 'title-case'
import { explainerTexts } from '@/lib/en_text_contents'
import { useFilters } from '@/contexts/FilterContext'
import type { BudgetDocument } from '@/lib/data/budget-documents'

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
  documentTypeOptions: { value: string; count: number }[]
  agendaItemOptions: { value: string; count: number }[]
  yearRange: { min: number; max: number } | null
  yearDistribution: { [year: string]: number }
  originalYearDistribution?: { [year: string]: number }
  showAdvancedSearch: boolean
  setShowAdvancedSearch: (show: boolean) => void
  entitiesData: Entity[]
  allOrgans: Organ[]
  budgetDocuments: BudgetDocument[]
  entityFilter?: string
  organFilter?: string
  pageType: 'main' | 'entity' | 'organ'
}

export function FilterControls({
  programmeOptions,
  subjectOptions,
  documentTypeOptions,
  agendaItemOptions,
  yearRange,
  yearDistribution,
  originalYearDistribution,
  showAdvancedSearch,
  entitiesData,
  allOrgans,
  budgetDocuments,
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

  const [searchInput, setSearchInput] = useState(filters.keyword || '')

  // Sync search input with filters when filters change externally (e.g., clear all)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional sync from external state
    setSearchInput(filters.keyword || '')
  }, [filters.keyword])

  const handleSearch = () => {
    const trimmedValue = searchInput.trim()
    if (trimmedValue !== (filters.keyword || '').trim()) {
      setFilter('keyword', trimmedValue || undefined)
    }
  }

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
          <div className="py-4 pl-1">
            <AdvancedSearch
              programme={filters.programme || ''}
              subject={filters.subject || ''}
              budgetDocument={filters.budget_document || ''}
              documentType={filters.document_type || ''}
              agendaItem={filters.agenda_item || ''}
              onProgrammeChange={(value) => setFilter('programme', value)}
              onSubjectChange={(value) => setFilter('subject', value)}
              onBudgetDocumentChange={(value) =>
                setFilter('budget_document', value)
              }
              onDocumentTypeChange={(value) =>
                setFilter('document_type', value)
              }
              onAgendaItemChange={(value) => setFilter('agenda_item', value)}
              programmeOptions={programmeOptions}
              subjectOptions={subjectOptions}
              documentTypeOptions={documentTypeOptions}
              agendaItemOptions={agendaItemOptions}
              budgetDocuments={budgetDocuments}
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

      {/* Filter Chips */}
      {(hasSearch || hasFilters) && (
        <div className="rounded-md border border-border px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Active filters
            </span>
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
                            (e) => e.entity === displayFilters.crossCitingEntity
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

            {displayFilters.document_type && (
              <FilterBadge
                icon={FileType}
                label={`Type: ${displayFilters.document_type}`}
                onClear={() => clearFilter('document_type')}
                variant="secondary"
              />
            )}

            {displayFilters.agenda_item && (
              <FilterBadge
                icon={List}
                label={`Agenda: ${displayFilters.agenda_item}`}
                onClear={() => clearFilter('agenda_item')}
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
                  label={`Budget: ${budgetDocuments.find((d) => d.slug === displayFilters.budget_document)?.display_name ?? displayFilters.budget_document}`}
                  onClear={() => clearFilter('budget_document')}
                  variant="secondary"
                />
              )}

            <Button
              variant="default"
              size="sm"
              onClick={clearAllFilters}
              className="ml-auto shrink-0 bg-trout text-white hover:bg-trout/90"
            >
              <X className="h-4 w-4" />
              Clear All
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
