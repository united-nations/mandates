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
  entitiesData: Entity[]
  allOrgans: Organ[]
  budgetDocuments: BudgetDocument[]
  toolbarSlot?: React.ReactNode
}

export function FilterControls({
  entitiesData,
  allOrgans,
  budgetDocuments,
  toolbarSlot,
}: FilterControlsProps) {
  const { filters, setFilter, clearFilter, clearAllFilters } = useFilters()

  const [searchInput, setSearchInput] = useState(filters.keyword || '')

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

  const getDisplayFilters = () => {
    const displayFilters = { ...filters }

    delete displayFilters.page
    delete displayFilters.limit
    delete displayFilters.sort_by
    delete displayFilters.keyword
    delete displayFilters.mode
    delete displayFilters.ppb_version

    return displayFilters
  }

  const displayFilters = getDisplayFilters()
  const hasFilters = Object.values(displayFilters).some(
    (value) => value && value !== 'all'
  )
  const hasSearch = filters.keyword && filters.keyword.trim().length > 0

  const yearRangeDisplay =
    filters.start_year && filters.end_year
      ? `${filters.start_year}-${filters.end_year}`
      : null

  return (
    <div>
      {/* Search bar + toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 grow basis-48">
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
        <div className="contents">
          {toolbarSlot}
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
