'use client'

import { FilterBadge } from '@/components/FilterBadge'
import { Button } from '@/components/ui/button'
import { useFilters } from '@/contexts/FilterContext'
import {
  BUDGET_STREAM_LABELS,
  SUBJECT_DOMAIN_LABELS,
} from '@/lib/filter-constants'
import { FOUNDATIONAL_LABEL } from '@/lib/foundational'
import {
  BookOpen,
  Building,
  Calendar,
  FileType,
  Landmark,
  List,
  Network,
  Receipt,
  Search,
  Tags,
  Target,
  X,
} from 'lucide-react'
import { titleCase } from 'title-case'
import { EntityName } from './EntityName'
import { OrganName } from './OrganName'

interface Entity {
  entity: string
  entity_long: string
}

interface Organ {
  short: string
  long: string
}

interface ActiveFiltersProps {
  entitiesData: Entity[]
  allOrgans: Organ[]
  className?: string
}

/**
 * The "Active filters" chip bar for the mandate explorer. Extracted from
 * FilterControls so it can render above the summary stat cards while the search
 * bar and toolbar stay below them. Renders nothing when no filters are active.
 */
export function ActiveFilters({
  entitiesData,
  allOrgans,
  className,
}: ActiveFiltersProps) {
  const { filters, clearFilter, clearAllFilters } = useFilters()

  const displayFilters = { ...filters }
  delete displayFilters.page
  delete displayFilters.limit
  delete displayFilters.sort_by
  delete displayFilters.keyword
  delete displayFilters.mode
  delete displayFilters.ppb_version
  delete displayFilters.group

  const hasFilters = Object.values(displayFilters).some(
    (value) => value && value !== 'all'
  )
  const hasSearch = filters.keyword && filters.keyword.trim().length > 0

  const yearRangeDisplay =
    filters.start_year && filters.end_year
      ? `${filters.start_year}-${filters.end_year}`
      : null

  if (!hasSearch && !hasFilters) return null

  return (
    <div className={className}>
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

          {displayFilters.budget_part && (
            <FilterBadge
              icon={Network}
              label={`Part: ${displayFilters.budget_part}`}
              onClear={() => clearFilter('budget_part')}
              variant="secondary"
            />
          )}

          {displayFilters.section && (
            <FilterBadge
              icon={Network}
              label={`Section: ${displayFilters.section}`}
              onClear={() => clearFilter('section')}
              variant="secondary"
            />
          )}

          {displayFilters.subprogramme && (
            <FilterBadge
              icon={Network}
              label={displayFilters.subprogramme}
              onClear={() => clearFilter('subprogramme')}
              variant="secondary"
            />
          )}

          {displayFilters.foundational === 'true' && (
            <FilterBadge
              icon={Network}
              label={FOUNDATIONAL_LABEL}
              onClear={() => clearFilter('foundational')}
              variant="secondary"
            />
          )}

          {/* Superseded by the section filter, but still reachable from old
              ?programme= links, so it still needs a chip to be clearable. */}
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

          {displayFilters.subject_domain && (
            <FilterBadge
              icon={Tags}
              label={`Subject domain: ${
                SUBJECT_DOMAIN_LABELS[displayFilters.subject_domain] ??
                displayFilters.subject_domain
              }`}
              onClear={() => clearFilter('subject_domain')}
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
                label={`Budget: ${BUDGET_STREAM_LABELS[displayFilters.budget_document as keyof typeof BUDGET_STREAM_LABELS] ?? displayFilters.budget_document}`}
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
    </div>
  )
}
