'use client'

import { Suspense, useRef, useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import DocumentTable from '@/components/DocumentTable'
import ResolutionsTreemapView from '@/components/ResolutionsTreemapView'
import { resolutionsConfig } from '@/lib/config'
import { Resolution, DocumentFilters } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { FileText, RotateCcw, ChevronDown } from 'lucide-react'
import { LoadingFallback } from '@/components/LoadingFallback'

function ResolutionsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const dimensionTextRef = useRef<HTMLSpanElement>(null)
  const [dropdownMinWidth, setDropdownMinWidth] = useState<number>(0)

  // Read all state from URL (single source of truth)
  const view = searchParams.get('view') || 'treemap'
  const dimension =
    (searchParams.get('dimension') as 'length' | 'similarity' | 'frequency') ||
    'length'

  // Filters for treemap (read from URL)
  const treemapFilters: DocumentFilters = {
    organ: searchParams.get('organ') || undefined,
    is_recurring_series: searchParams.get('is_recurring_series') || undefined,
    year_range: searchParams.get('year_range') || undefined,
    include_missing_fulltexts:
      searchParams.get('include_missing_fulltexts') || undefined,
    // Note: length_bucket and similarity_bucket are managed by table/treemap components
  }

  // Helper to update URL with any parameter changes
  const updateURL = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })

    router.replace(`${pathname}?${params}`, { scroll: false })
  }

  // View switching
  const switchToTreemap = () => {
    // Reset the bucket filter for the current dimension when switching to treemap
    const updates: Record<string, string | null> = { view: null }
    if (dimension === 'length') {
      updates.length_bucket = null
    } else if (dimension === 'similarity') {
      updates.similarity_bucket = null
    } else if (dimension === 'frequency') {
      updates.frequency_bucket = null
    }
    updateURL(updates)
  }

  const switchToTable = () => {
    updateURL({ view: 'table' })
  }

  // Handle treemap cell click - set the appropriate bucket filter and switch to table
  const handleCellClick = (
    clickedDimension: 'length' | 'similarity' | 'frequency',
    bucketId: string
  ) => {
    updateURL({
      view: 'table',
      length_bucket: clickedDimension === 'length' ? bucketId : null,
      similarity_bucket: clickedDimension === 'similarity' ? bucketId : null,
      frequency_bucket: clickedDimension === 'frequency' ? bucketId : null,
      page: null, // Reset pagination
    })
  }

  // Filter handlers
  const handleOrganChange = (value: string) => {
    updateURL({
      organ: value === 'all' ? null : value,
      page: null,
    })
  }

  const handleRecurringSeriesChange = (value: string) => {
    updateURL({
      is_recurring_series: value === 'all' ? null : value,
      page: null,
    })
  }

  const handleYearRangeChange = (value: string) => {
    updateURL({
      year_range: value === 'all' ? null : value,
      page: null,
    })
  }

  const handleIncludeMissingFulltextsChange = (checked: boolean) => {
    updateURL({
      include_missing_fulltexts: checked ? null : 'false',
      page: null,
    })
  }

  const handleResetFilters = () => {
    updateURL({
      organ: null,
      is_recurring_series: null,
      year_range: null,
      length_bucket: null,
      similarity_bucket: null,
      frequency_bucket: null,
      include_missing_fulltexts: null,
      title_search: null,
      page: null,
    })
  }

  const handleDimensionChange = (
    newDimension: 'length' | 'similarity' | 'frequency'
  ) => {
    updateURL({
      dimension: newDimension,
      // Reset bucket filters when changing dimension
      length_bucket: null,
      similarity_bucket: null,
      frequency_bucket: null,
      page: null,
    })
  }

  // Get dimension display text
  const dimensionText =
    dimension === 'length'
      ? 'Length'
      : dimension === 'similarity'
        ? 'Similarity to Previous'
        : 'Frequency'

  // Organ acronyms mapping
  const organAcronyms: Record<string, string> = {
    'General Assembly': 'GA',
    'Economic and Social Council': 'ECOSOC',
    'Security Council': 'SC',
    'Human Rights Council': 'HRC',
  }

  // Get organ display text for header (using acronyms)
  const organText = searchParams.get('organ')
    ? organAcronyms[searchParams.get('organ')!] || 'All'
    : 'All'

  // Measure the current dimension text width
  useEffect(() => {
    if (dimensionTextRef.current) {
      const width = dimensionTextRef.current.offsetWidth
      setDropdownMinWidth(width)
    }
  }, [dimensionText])

  // Check if there are any active filters
  const hasActiveFilters =
    searchParams.get('organ') ||
    searchParams.get('is_recurring_series') ||
    searchParams.get('year_range') ||
    searchParams.get('length_bucket') ||
    searchParams.get('similarity_bucket') ||
    searchParams.get('frequency_bucket') ||
    searchParams.get('title_search') ||
    searchParams.get('include_missing_fulltexts') === 'false'

  // Display values for selects
  const selectedOrgan = searchParams.get('organ') || 'all'
  const selectedRecurringSeries =
    searchParams.get('is_recurring_series') || 'all'
  const selectedYearRange = searchParams.get('year_range') || 'all'

  const recurringSeriesOptions = [
    { value: 'all', label: 'All Documents' },
    { value: 'true', label: 'Recurring Documents' },
    { value: 'false', label: 'One-time Documents' },
  ]

  const yearRangeOptions = [
    { value: 'all', label: 'All Years' },
    { value: '1990-2025', label: '1990-2025' },
  ]

  return (
    <div className="relative right-1/2 left-1/2 -mr-[50vw] -ml-[50vw] w-screen">
      {/* Header with filters - always visible */}
      <div className="mx-auto mb-4 max-w-4xl px-8 pt-6 sm:px-12 lg:max-w-6xl lg:px-16 xl:max-w-7xl">
        {/* Title row */}
        <div className="mb-1 flex items-center gap-3">
          <FileText className="h-8 w-8 text-un-blue" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            <span className={searchParams.get('organ') ? 'text-un-blue' : ''}>
              {organText}
            </span>{' '}
            Resolutions by{' '}
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-0 text-un-blue transition-colors hover:text-un-blue/80 focus:outline-hidden">
                <span
                  ref={dimensionTextRef}
                  className="border-b-2 border-un-blue/20 transition-colors hover:border-un-blue/40"
                >
                  {dimensionText}
                </span>
                <ChevronDown className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="mt-1 w-auto border-un-blue/20 p-0.5 shadow-xs"
                style={{ minWidth: dropdownMinWidth }}
              >
                {dimension !== 'length' && (
                  <DropdownMenuItem
                    onClick={() => handleDimensionChange('length')}
                    className="cursor-pointer rounded-sm px-3 py-2 text-sm font-semibold whitespace-nowrap text-un-blue hover:bg-un-blue/10 hover:text-un-blue focus:bg-un-blue/10 focus:text-un-blue"
                  >
                    Word Length
                  </DropdownMenuItem>
                )}
                {dimension !== 'similarity' && (
                  <DropdownMenuItem
                    onClick={() => handleDimensionChange('similarity')}
                    className="cursor-pointer rounded-sm px-3 py-2 text-sm font-semibold whitespace-nowrap text-un-blue hover:bg-un-blue/10 hover:text-un-blue focus:bg-un-blue/10 focus:text-un-blue"
                  >
                    Similarity to Previous
                  </DropdownMenuItem>
                )}
                {dimension !== 'frequency' && (
                  <DropdownMenuItem
                    onClick={() => handleDimensionChange('frequency')}
                    className="cursor-pointer rounded-sm px-3 py-2 text-sm font-semibold whitespace-nowrap text-un-blue hover:bg-un-blue/10 hover:text-un-blue focus:bg-un-blue/10 focus:text-un-blue"
                  >
                    Frequency
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </h1>
        </div>

        {/* View toggle and filters row */}
        <div className="mt-4 mb-3 flex items-center justify-between gap-4">
          {/* View toggle buttons */}
          <div className="inline-flex h-9 items-center justify-center gap-0.5 rounded-md border border-med-gray bg-muted p-0.5 text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              onClick={switchToTreemap}
              className={`h-full rounded-sm px-3 text-sm font-medium transition-colors ${
                view === 'treemap'
                  ? 'pointer-events-none bg-background text-un-blue shadow-xs'
                  : 'hover:bg-background/60 hover:text-foreground'
              }`}
            >
              Treemap
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={switchToTable}
              className={`h-full rounded-sm px-3 text-sm font-medium transition-colors ${
                view === 'table'
                  ? 'pointer-events-none bg-background text-un-blue shadow-xs'
                  : 'hover:bg-background/60 hover:text-foreground'
              }`}
            >
              Table
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedOrgan} onValueChange={handleOrganChange}>
              <SelectTrigger
                id="organ-filter"
                className={`h-9 w-[240px] bg-white px-3 text-sm data-[state=open]:border-un-blue ${selectedOrgan !== 'all' ? 'border-un-blue' : 'border-med-gray'}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {resolutionsConfig.organOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedYearRange}
              onValueChange={handleYearRangeChange}
            >
              <SelectTrigger
                id="year-range-filter"
                className={`h-9 w-[120px] bg-white px-3 text-sm data-[state=open]:border-un-blue ${selectedYearRange !== 'all' ? 'border-un-blue' : 'border-med-gray'}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedRecurringSeries}
              onValueChange={handleRecurringSeriesChange}
            >
              <SelectTrigger
                id="recurring-filter"
                className={`h-9 w-[200px] bg-white px-3 text-sm data-[state=open]:border-un-blue ${selectedRecurringSeries !== 'all' ? 'border-un-blue' : 'border-med-gray'}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {recurringSeriesOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              className="h-9 w-9 border-med-gray bg-trout p-0 text-white hover:bg-trout/80 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:opacity-50"
              title="Reset filters to default"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {view === 'treemap' ? (
        <div className="mx-auto mt-4 max-w-4xl px-8 sm:px-12 lg:max-w-6xl lg:px-16 xl:max-w-7xl">
          <ResolutionsTreemapView
            filters={treemapFilters}
            dimension={dimension}
            onCellClick={handleCellClick}
          />

          {/* Include missing fulltexts checkbox - below treemap */}
          <div className="mt-3 flex items-center justify-start gap-2 pb-6">
            <Checkbox
              id="include-missing-fulltexts"
              checked={
                searchParams.get('include_missing_fulltexts') !== 'false'
              }
              onCheckedChange={handleIncludeMissingFulltextsChange}
              className="border-med-gray data-[state=checked]:border-un-blue data-[state=checked]:bg-un-blue"
            />
            <label
              htmlFor="include-missing-fulltexts"
              className="cursor-pointer text-sm text-muted-foreground select-none"
            >
              Include resolutions with missing fulltexts
            </label>
          </div>
        </div>
      ) : (
        <DocumentTable<Resolution>
          config={resolutionsConfig}
          hideHeader={true}
        />
      )}
    </div>
  )
}

export default function ResolutionsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResolutionsPageContent />
    </Suspense>
  )
}
