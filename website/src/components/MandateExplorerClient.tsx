'use client'

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
import { explainerTexts } from '@/lib/en_text_contents'
import type { ApiResponse } from '@/types'
import { ChevronDown, Info } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { MandateCompactList } from './table/MandateCompactList'
import { MandateDataTable } from './table/MandateDataTable'
import { useColumnVisibility } from './table/useColumnVisibility'
// import { YearBarCard } from './YearBarCard' // Years card hidden — see summary cards section

interface MandateExplorerClientProps {
  data: ApiResponse
}

export function MandateExplorerClient({ data }: MandateExplorerClientProps) {
  const { filters, setFilter, setMultipleFilters } = useFilters()
  const searchParams = useSearchParams()

  const [ppbDropdownOpen, setPpbDropdownOpen] = useState(false)
  const { visibleColumns, handleToggleColumn, handleResetColumns } =
    useColumnVisibility()

  const pageSize = parseInt(searchParams.get('limit') || '25', 10)
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
    <div className="inline-flex flex-wrap items-center rounded-md bg-muted p-0.5 whitespace-nowrap">
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
            className={`inline-flex h-7 grow cursor-pointer items-center gap-1 rounded-sm px-2.5 text-xs font-medium transition-all ${
              currentMode === 'active_mandates'
                ? 'bg-background text-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
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
            className={`inline-flex h-7 grow items-center rounded-sm px-2.5 text-xs font-medium transition-all ${
              currentMode === 'all_resolutions'
                ? 'bg-background text-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
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
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground">
          <Switch
            checked={filters.group === '1'}
            onCheckedChange={(checked) =>
              setFilter('group', checked ? '1' : undefined)
            }
            className="data-[state=unchecked]:bg-gray-300"
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
      {/* Summary stats now live in the page header (HeaderStats), beside the
          explainer text. The Source Documents / Organs / Entities cards became
          the minimal stat rows there; the Citations card was dropped.

          Years card still hidden — keep code for potential re-enable:
          {filterOptions.yearRange && (
            <YearBarCard
              yearDistribution={filterOptions.yearDistributionUnfiltered ?? filterOptions.yearDistribution}
            />
          )}
      */}

      <div className="pt-4">
        {/* Section Title and Sort (mobile) + FilterControls */}
        <div className="mb-4">
          <div className="mb-2">
            <h2 className="text-2xl font-bold tracking-tight">
              {explainerTexts.dataCards.sectionTitle}
            </h2>
          </div>
          <FilterControls
            entitiesData={allEntities}
            allOrgans={allOrgans}
            toolbarSlot={
              <div className="flex flex-wrap items-center gap-3">
                {groupToggle}
                {modeToggle}
              </div>
            }
          />
        </div>

        {/* Section 1 of the 2027 budget is sourced from the preliminary
            A/81/6 (Sect. 1); its citations may change in the final version. */}
        {activePpb?.short === '2027' && (
          <div className="mb-4 flex items-start gap-2 border-l-2 border-un-blue/40 bg-un-blue/5 px-3 py-2 text-sm text-muted-foreground">
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-un-blue"
              aria-hidden
            />
            <p>
              Section&nbsp;1 (Overall policymaking, direction and coordination)
              citations are preliminary, drawn from the advance version of
              A/81/6&nbsp;(Sect.&nbsp;1), and may change in the final budget.
            </p>
          </div>
        )}

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
            onToggleColumn={handleToggleColumn}
            onResetColumns={handleResetColumns}
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
  )
}
