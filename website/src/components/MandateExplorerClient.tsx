'use client'

import { ActiveFilters } from '@/components/ActiveFilters'
import { FilterControls } from '@/components/FilterControls'
import { PaginationControls } from '@/components/PaginationControls'
import { Switch } from '@/components/ui/switch'
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
import type { ApiResponse } from '@/types'
import { ChevronDown } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { ColumnPicker } from './table/ColumnPicker'
import { MandateCompactList } from './table/MandateCompactList'
import { MandateDataTable } from './table/MandateDataTable'
import { DEFAULT_VISIBLE_COLUMNS } from './table/MandateColumns'
import { useColumnVisibility } from './table/useColumnVisibility'
// import { YearBarCard } from './YearBarCard' // Years card hidden — see summary cards section

interface MandateExplorerClientProps {
  data: ApiResponse
}

/**
 * The table band grows with the number of columns the user has switched on.
 * At the default two columns it sits at max-w-6xl, flush with the page heading
 * and the rest of the page; each extra column buys one step of extra width
 * rather than jumping straight to the full break-out.
 */
const TABLE_WIDTH_STEPS = [
  'max-w-6xl',
  'max-w-7xl',
  'max-w-[88rem]',
  'max-w-[100rem]',
] as const

export function MandateExplorerClient({ data }: MandateExplorerClientProps) {
  const { filters, setFilter, setMultipleFilters } = useFilters()
  const searchParams = useSearchParams()

  const [ppbDropdownOpen, setPpbDropdownOpen] = useState(false)
  const { visibleColumns, handleToggleColumn, handleResetColumns } =
    useColumnVisibility()

  // Hydration-safe: useColumnVisibility serves DEFAULT_VISIBLE_COLUMNS as its
  // server snapshot, so server and first client render agree on step 0.
  const extraColumns = Math.max(
    0,
    visibleColumns.size - DEFAULT_VISIBLE_COLUMNS.size
  )
  const tableWidthClass =
    TABLE_WIDTH_STEPS[Math.min(extraColumns, TABLE_WIDTH_STEPS.length - 1)]

  const pageSize = parseInt(searchParams.get('limit') || '15', 10)
  const { mandates, pagination, filterOptions, reference, sidebar } = data
  const allOrgans = reference?.organs || []
  const allEntities = reference?.entities || []

  // Organ/entity citation counts drive the table's column filters.
  const organs = sidebar?.organs || []
  const entities = sidebar?.entities || []

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
  const defaultVersion = ppbVersions.find((v) => v.isDefault) ?? ppbVersions[0]
  const currentPpbVersion = filters.ppb_version || defaultVersion?.value
  const activePpb =
    ppbVersions.find((v) => v.value === currentPpbVersion) ?? defaultVersion

  const ppbDropdown = (
    <DropdownMenu open={ppbDropdownOpen} onOpenChange={setPpbDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="-mb-px inline-flex items-center gap-0.5 border-b border-current pb-px"
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
            onClick={() =>
              setMultipleFilters({
                mode: 'active_mandates',
                ppb_version: v.value,
              })
            }
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
    <div className="inline-flex flex-wrap items-center rounded-md bg-gray-100 p-0.5 whitespace-nowrap">
      <Tooltip
        open={ppbDropdownOpen ? false : undefined}
        key={ppbDropdownOpen ? 'dropdown-open' : 'dropdown-closed'}
      >
        <TooltipTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!ppbDropdownOpen) handleModeChange('active_mandates')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ')
                handleModeChange('active_mandates')
            }}
            className={`inline-flex h-7 grow cursor-pointer items-center gap-1 rounded-sm px-2.5 text-sm font-medium transition-all ${
              currentMode === 'active_mandates'
                ? 'bg-background text-gray-900 shadow'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <span>Cited Mandate Sources</span>
            {ppbDropdown}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          Documents cited by UN entities in the{' '}
          {activePpb?.long ?? 'proposed budget'}. Includes resolutions,
          decisions, conventions, and other formal documents with full citation
          data.
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => handleModeChange('all_resolutions')}
            className={`inline-flex h-7 grow items-center rounded-sm px-2.5 text-sm font-medium transition-all ${
              currentMode === 'all_resolutions'
                ? 'bg-background text-gray-900 shadow'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All Documents
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" collisionPadding={8} className="max-w-xs">
          ~42,000 resolutions, decisions and presidential statements of the
          General Assembly, Security Council, ECOSOC and Human Rights Council
          (Dag Hammarskjöld Library, 1946–present), plus any other documents
          cited in the latest proposed budget. Where a document is cited in a
          PPB, entity and citation data is available.
        </TooltipContent>
      </Tooltip>
    </div>
  )

  const groupToggle = (
    <Tooltip>
      <TooltipTrigger asChild>
        <label
          className={`inline-flex h-8 cursor-pointer items-center gap-1.5 text-sm whitespace-nowrap transition-colors ${
            filters.group === '1'
              ? 'font-medium text-gray-900'
              : 'text-gray-500'
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
        Collapse recurring resolutions to one row per series — the most recent
        matching version, expandable to its earlier versions. Versions are
        identified automatically by matching titles within the same organ.
      </TooltipContent>
    </Tooltip>
  )

  return (
    <div>
      {/* Summary counts and the organ / entity / topic directories now live in
          the DirectoryExplorer buttons above this explorer (each opens a modal);
          the charts moved to /secretariat/analytics.

          Years card still hidden — keep code for potential re-enable:
          {filterOptions.yearRange && (
            <YearBarCard
              yearDistribution={filterOptions.yearDistributionUnfiltered ?? filterOptions.yearDistribution}
            />
          )}
      */}

      <div>
        {/* Narrow band: active filters line up with the rest of the page
            (max-w-6xl). */}
        <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-16">
          <ActiveFilters
            entitiesData={allEntities}
            allOrgans={allOrgans}
            className="mb-4"
          />
        </div>

        {/* Table band: the table and everything that operates on it — search,
            the group/scope/column toggles, and pagination — share one width so
            the toolbar stays aligned with the table edges. At the default two
            columns that width is max-w-6xl, flush with the rest of the page;
            it steps outwards only as columns are added. */}
        <div
          className={`mx-auto ${tableWidthClass} px-6 transition-[max-width] duration-300 ease-out md:px-12 lg:px-16`}
        >
          <div className="mb-4">
            <FilterControls
              entitiesData={allEntities}
              allOrgans={allOrgans}
              toolbarSlot={
                <div className="flex flex-wrap items-center gap-3">
                  {groupToggle}
                  {modeToggle}
                  {/* Only meaningful for the desktop table; the mobile compact
                      list has no columns to toggle. */}
                  <div className="hidden lg:block">
                    <ColumnPicker
                      visibleColumns={visibleColumns}
                      onToggle={handleToggleColumn}
                      onReset={handleResetColumns}
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
