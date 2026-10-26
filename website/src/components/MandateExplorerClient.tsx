'use client'

import { FilterControls } from '@/components/FilterControls'
import { PaginationControls } from '@/components/PaginationControls'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useFilters } from '@/contexts/FilterContext'
import { explainerTexts } from '@/lib/en_text_contents'
import type { ApiResponse } from '@/types'
import { useSearchParams } from 'next/navigation'
import { ColumnPicker } from './table/ColumnPicker'
import { MandateCompactList } from './table/MandateCompactList'
import { MandateDataTable } from './table/MandateDataTable'
import { useColumnVisibility } from './table/useColumnVisibility'
// import { YearBarCard } from './YearBarCard' // Years card hidden — see summary cards section

interface MandateExplorerClientProps {
  data: ApiResponse
}

export function MandateExplorerClient({ data }: MandateExplorerClientProps) {
  const { filters, setFilter } = useFilters()
  const searchParams = useSearchParams()

  const { visibleColumns, handleToggleColumn, handleResetColumns } =
    useColumnVisibility()

  const pageSize = parseInt(searchParams.get('limit') || '15', 10)
  const { mandates, pagination, filterOptions, reference, sidebar } = data
  const allOrgans = reference?.organs || []
  const allEntities = reference?.entities || []

  // Organ/entity citation counts drive the table's column filters.
  const organs = sidebar?.organs || []
  const entities = sidebar?.entities || []

  // The scope switch (all documents vs. a budget version) and the budget-version
  // picker used to live here as a segmented toggle with a dropdown buried in one
  // of its segments. Both now sit in the "documents cited as mandates" card at
  // the top of the page, next to the number each choice produces.

  const groupToggle = (
    <Tooltip>
      <TooltipTrigger asChild>
        <label
          className={`inline-flex h-8 cursor-pointer items-center gap-1.5 text-sm whitespace-nowrap transition-colors ${
            filters.group === '1'
              ? 'font-medium text-foreground'
              : 'text-muted-foreground'
          }`}
        >
          <Switch
            checked={filters.group === '1'}
            onCheckedChange={(checked) =>
              setFilter('group', checked ? '1' : undefined)
            }
          />
          Group versions
        </label>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        {explainerTexts.versionMatching.groupTooltip}
      </TooltipContent>
    </Tooltip>
  )

  return (
    <div>
      {/* Registry totals and view navigation live in the shared card tabs;
          charts are available at /secretariat/analytics.

          Years card still hidden — keep code for potential re-enable:
          {filterOptions.yearRange && (
            <YearBarCard
              yearDistribution={filterOptions.yearDistributionUnfiltered ?? filterOptions.yearDistribution}
            />
          )}
      */}

      <div>
        {/* Active filters and citation scope sit above the explorer.

            Table band: the table and everything that operates on it — search,
            the group/scope/column toggles, and pagination — share one width so
            the toolbar stays aligned with the table edges. That width is the
            page's own max-w-6xl and is deliberately fixed, so the band stays
            flush with the heading and the explore cards above it. When the
            column set outgrows it the table scrolls sideways rather than the
            band widening. */}
        <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-16">
          <div className="mb-4">
            <FilterControls
              entitiesData={allEntities}
              allOrgans={allOrgans}
              toolbarSlot={
                <div className="flex flex-wrap items-center gap-3">
                  {groupToggle}
                  {/* Only meaningful for the desktop table; the mobile compact
                      list has no columns to toggle. */}
                  <div className="hidden lg:block">
                    <ColumnPicker
                      visibleColumns={visibleColumns}
                      onToggle={handleToggleColumn}
                      onReset={handleResetColumns}
                      facets={{
                        organCounts: organs,
                        entityCounts: entities,
                        filterOptions,
                      }}
                    />
                  </div>
                </div>
              }
            />
          </div>

          {/* Data table (desktop) */}
          <div className="hidden lg:block">
            <MandateDataTable
              mandates={mandates}
              organsData={allOrgans}
              entitiesData={allEntities}
              organCounts={organs}
              entityCounts={entities}
              filterOptions={filterOptions}
              visibleColumns={visibleColumns}
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
    </div>
  )
}
