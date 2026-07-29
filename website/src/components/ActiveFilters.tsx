'use client'

import { FilterBadge } from '@/components/FilterBadge'
import { Button } from '@/components/ui/button'
import { useFilters } from '@/contexts/FilterContext'
import {
  BUDGET_STREAM_LABELS,
  SUBJECT_DOMAIN_LABELS,
} from '@/lib/filter-constants'
import { FOUNDATIONAL_LABEL } from '@/lib/foundational'
import { X } from 'lucide-react'
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
 * The "Active filters" chip bar for the mandate explorer. Renders above the four
 * explore cards (app/secretariat/page.tsx), because those cards' numbers are
 * computed against exactly these filters. Renders nothing when none are active.
 *
 * No leading icons on the chips: eleven filter kinds needed eleven glyphs, none
 * of which said anything the label next to it did not already say in words.
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
              label={`"${filters.keyword}"`}
              onClear={() => clearFilter('keyword')}
            />
          )}

          {displayFilters.entity && displayFilters.entity !== 'all' && (
            <FilterBadge
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
            />
          )}

          {displayFilters.crossCitingEntity &&
            displayFilters.crossCitingEntity !== 'all' && (
              <FilterBadge
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
              />
            )}

          {displayFilters.organ && displayFilters.organ !== 'all' && (
            <FilterBadge
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
            />
          )}

          {displayFilters.budget_part && (
            <FilterBadge
              label={`Part: ${displayFilters.budget_part}`}
              onClear={() => clearFilter('budget_part')}
            />
          )}

          {displayFilters.section && (
            <FilterBadge
              label={`Section: ${displayFilters.section}`}
              onClear={() => clearFilter('section')}
            />
          )}

          {displayFilters.subprogramme && (
            <FilterBadge
              label={displayFilters.subprogramme}
              onClear={() => clearFilter('subprogramme')}
            />
          )}

          {displayFilters.foundational === 'true' && (
            <FilterBadge
              label={FOUNDATIONAL_LABEL}
              onClear={() => clearFilter('foundational')}
            />
          )}

          {/* Superseded by the section filter, but still reachable from old
              ?programme= links, so it still needs a chip to be clearable. */}
          {displayFilters.programme && (
            <FilterBadge
              label={`Programme: ${displayFilters.programme}`}
              onClear={() => clearFilter('programme')}
            />
          )}

          {displayFilters.subject && (
            <FilterBadge
              label={`Subject: ${titleCase(displayFilters.subject)}`}
              onClear={() => clearFilter('subject')}
            />
          )}

          {displayFilters.subject_domain && (
            <FilterBadge
              label={`Subject domain: ${
                SUBJECT_DOMAIN_LABELS[displayFilters.subject_domain] ??
                displayFilters.subject_domain
              }`}
              onClear={() => clearFilter('subject_domain')}
            />
          )}

          {displayFilters.document_type && (
            <FilterBadge
              label={`Type: ${displayFilters.document_type}`}
              onClear={() => clearFilter('document_type')}
            />
          )}

          {displayFilters.agenda_item && (
            <FilterBadge
              label={`Agenda: ${displayFilters.agenda_item}`}
              onClear={() => clearFilter('agenda_item')}
            />
          )}

          {yearRangeDisplay && (
            <FilterBadge
              label={`Year: ${yearRangeDisplay}`}
              onClear={() => {
                clearFilter('start_year')
                clearFilter('end_year')
              }}
            />
          )}

          {displayFilters.budget_document &&
            displayFilters.budget_document !== 'all' && (
              <FilterBadge
                label={`Budget: ${BUDGET_STREAM_LABELS[displayFilters.budget_document as keyof typeof BUDGET_STREAM_LABELS] ?? displayFilters.budget_document}`}
                onClear={() => clearFilter('budget_document')}
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
