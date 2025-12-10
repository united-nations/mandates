'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import type { BaseDocument, DocumentConfig } from '@/types'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  RotateCcw,
  X,
} from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Column } from 'primereact/column'
import { DataTable, DataTableFilterMeta } from 'primereact/datatable'
import { Dropdown } from 'primereact/dropdown'
import { useEffect, useState } from 'react'
import {
  lengthBuckets,
  similarityBuckets,
  frequencyBuckets,
} from '@/lib/treemap-config'

interface ApiResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface DocumentTableProps<T extends BaseDocument> {
  config: DocumentConfig<T>
  hideHeader?: boolean
}

export default function DocumentTable<T extends BaseDocument>({
  config,
  hideHeader = false,
}: DocumentTableProps<T>) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [documents, setDocuments] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  // DataTable filters state (for UI only - synced with URL)
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    length_bucket: { value: null, matchMode: 'custom' as const },
    similarity_bucket: { value: null, matchMode: 'custom' as const },
    frequency_bucket: { value: null, matchMode: 'custom' as const },
    title: { value: null, matchMode: 'custom' as const },
  })

  const [sortField, setSortField] = useState<string>('year')
  const [sortOrder, setSortOrder] = useState<1 | -1>(-1)
  const [isShowingFilteredSubset, setIsShowingFilteredSubset] = useState(false)

  // Local state for title search input (before submission)
  const [titleSearchInput, setTitleSearchInput] = useState<string>('')

  const recurringSeriesOptions = [
    { value: 'all', label: 'All Documents' },
    { value: 'true', label: 'Recurring Documents' },
    { value: 'false', label: 'One-time Documents' },
  ]

  // Update URL helper
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

  // Fetch documents from API
  const fetchDocuments = async () => {
    try {
      setLoading(true)

      // Read all params from URL
      const page = parseInt(searchParams.get('page') || '1', 10)
      const sortFieldParam = searchParams.get('sortField') || 'year'
      const sortOrderParam = searchParams.get('sortOrder') || 'desc'
      const organ = searchParams.get('organ')
      const isRecurringSeries = searchParams.get('is_recurring_series')
      const yearRange = searchParams.get('year_range')
      const lengthBucket = searchParams.get('length_bucket')
      const similarityBucket = searchParams.get('similarity_bucket')
      const frequencyBucket = searchParams.get('frequency_bucket')

      // Build API query params
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortField: sortFieldParam,
        sortOrder: sortOrderParam,
      })

      if (organ && organ !== 'all') params.append('organ', organ)
      if (isRecurringSeries && isRecurringSeries !== 'all')
        params.append('is_recurring_series', isRecurringSeries)
      if (yearRange && yearRange !== 'all')
        params.append('year_range', yearRange)
      if (lengthBucket && lengthBucket !== 'all')
        params.append('length_bucket', lengthBucket)
      if (similarityBucket && similarityBucket !== 'all')
        params.append('similarity_bucket', similarityBucket)
      if (frequencyBucket && frequencyBucket !== 'all')
        params.append('frequency_bucket', frequencyBucket)

      const titleSearch = searchParams.get('title_search')
      if (titleSearch) params.append('title_search', titleSearch)

      const response = await fetch(`${config.apiEndpoint}?${params}`)
      if (!response.ok) throw new Error(`Failed to fetch ${config.type}`)

      const data: ApiResponse<T> = await response.json()
      setDocuments(data.data)
      setPagination(data.pagination)
      setError(null)
      setIsShowingFilteredSubset(false)

      // Update local sort state to match URL
      setSortField(sortFieldParam)
      setSortOrder(sortOrderParam === 'asc' ? 1 : -1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Fetch whenever searchParams changes
  useEffect(() => {
    const view = searchParams.get('view')
    const seriesTitle = searchParams.get('seriesTitle')
    const seriesOrgan = searchParams.get('seriesOrgan')
    const singleSymbol = searchParams.get('symbol')

    // Handle special views (series/single document)
    if (view === 'series' && seriesTitle && seriesOrgan) {
      handleSeriesClick(seriesTitle, seriesOrgan, false)
    } else if (view === 'single' && singleSymbol) {
      handlePreviousSymbolClick(singleSymbol, false)
    } else {
      fetchDocuments()
    }

    // Sync UI filter state with URL
    const lengthBucket = searchParams.get('length_bucket')
    const similarityBucket = searchParams.get('similarity_bucket')
    const frequencyBucket = searchParams.get('frequency_bucket')
    const titleSearch = searchParams.get('title_search')
    setFilters({
      length_bucket: {
        value: lengthBucket || null,
        matchMode: 'custom' as const,
      },
      similarity_bucket: {
        value: similarityBucket || null,
        matchMode: 'custom' as const,
      },
      frequency_bucket: {
        value: frequencyBucket || null,
        matchMode: 'custom' as const,
      },
      title: { value: titleSearch || null, matchMode: 'custom' as const },
    })

    // Sync local title search input with URL
    setTitleSearchInput(titleSearch || '')
  }, [searchParams])

  // PrimeReact filter change handler
  const handleFilterChange = (e: { filters: DataTableFilterMeta }) => {
    const lengthBucketValue = (e.filters.length_bucket as { value: string | null })?.value
    const similarityBucketValue = (e.filters.similarity_bucket as { value: string | null })?.value
    const frequencyBucketValue = (e.filters.frequency_bucket as { value: string | null })?.value
    const titleValue = (e.filters.title as { value: string | null })?.value

    // Simply update URL - the useEffect above will handle the refetch
    updateURL({
      length_bucket: lengthBucketValue || null,
      similarity_bucket: similarityBucketValue || null,
      frequency_bucket: frequencyBucketValue || null,
      title_search: titleValue || null,
      page: null, // Reset to page 1
    })
  }

  // Sorting handler
  const handleSort = (e: { sortField?: string; sortOrder?: 1 | -1 | 0 | null }) => {
    const newSortField = e.sortField as string
    const newSortOrder =
      e.sortField !== sortField ? -1 : sortOrder === 1 ? -1 : 1

    updateURL({
      sortField: newSortField !== 'year' ? newSortField : null,
      sortOrder: newSortOrder === -1 ? null : 'asc',
    })
  }

  // Pagination handler
  const handlePageChange = (e: { page?: number; rows?: number }) => {
    const newPage = (e.page ?? 0) + 1
    updateURL({ page: newPage > 1 ? newPage.toString() : null })
  }

  // Filter controls (for pages with headers)
  const handleOrganChange = (value: string) => {
    updateURL({
      organ: value !== config.defaultOrgan ? value : null,
      page: null,
    })
  }

  const handleRecurringSeriesChange = (value: string) => {
    updateURL({
      is_recurring_series: value !== 'all' ? value : null,
      page: null,
    })
  }

  const handleResetFilters = () => {
    router.replace(pathname)
  }

  // Series click handler
  const handleSeriesClick = async (
    normalizedTitle: string,
    organ: string,
    updateUrl: boolean = true
  ) => {
    try {
      setLoading(true)
      const response = await fetch(`${config.apiEndpoint}?limit=10000`)
      if (!response.ok) throw new Error(`Failed to fetch ${config.type}`)

      const data: ApiResponse<T> = await response.json()
      const seriesDocuments = data.data.filter(
        (doc) => doc.normalized_title === normalizedTitle && doc.organ === organ
      )

      if (seriesDocuments.length > 0) {
        const sortedSeries = seriesDocuments.sort((a, b) => b.year - a.year)
        setDocuments(sortedSeries)
        setPagination({
          page: 1,
          limit: sortedSeries.length,
          total: sortedSeries.length,
          totalPages: 1,
        })
        setIsShowingFilteredSubset(true)
        setSortField('year')
        setSortOrder(-1)

        if (updateUrl) {
          updateURL({
            view: 'series',
            seriesTitle: normalizedTitle,
            seriesOrgan: organ,
            symbol: null,
            page: null,
            sortField: null,
            sortOrder: null,
          })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load series')
    } finally {
      setLoading(false)
    }
  }

  // Previous symbol click handler
  const handlePreviousSymbolClick = async (
    previousSymbol: string,
    updateUrl: boolean = true
  ) => {
    const targetDocument = documents.find(
      (doc) => doc.symbol === previousSymbol
    )

    if (targetDocument) {
      // Scroll to existing row
      setTimeout(() => {
        const tableElement = document.querySelector('.p-datatable-tbody')
        const rows = tableElement?.querySelectorAll('tr')
        const targetIndex = documents.findIndex(
          (doc) => doc.symbol === previousSymbol
        )
        if (rows && targetIndex !== -1 && rows[targetIndex]) {
          rows[targetIndex].scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        }
      }, 100)
    } else {
      try {
        setLoading(true)
        const response = await fetch(`${config.apiEndpoint}?limit=10000`)
        if (!response.ok) throw new Error(`Failed to fetch ${config.type}`)

        const data: ApiResponse<T> = await response.json()
        const targetDocument = data.data.find(
          (doc) => doc.symbol === previousSymbol
        )

        if (targetDocument) {
          setDocuments([targetDocument])
          setPagination({ page: 1, limit: 1, total: 1, totalPages: 1 })
          setIsShowingFilteredSubset(true)

          if (updateUrl) {
            updateURL({
              view: 'single',
              symbol: previousSymbol,
              seriesTitle: null,
              seriesOrgan: null,
              page: null,
              sortField: null,
              sortOrder: null,
            })
          }
        } else {
          setError(`${config.type.slice(0, -1)} ${previousSymbol} not found.`)
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : `Failed to load ${config.type.slice(0, -1)}`
        )
      } finally {
        setLoading(false)
      }
    }
  }

  // Length bucket filter function (for PrimeReact)
  const lengthBucketFilter = (
    value: number | null,
    filterValue: string | null
  ): boolean => {
    if (!filterValue) return true

    const bucket = lengthBuckets.find((b) => b.id === filterValue)
    if (!bucket) return true

    if (bucket.min === null && bucket.max === null) return value === null
    if (value === null) return false
    if (bucket.max === null) return value >= bucket.min!

    return value >= bucket.min! && value <= bucket.max
  }

  // Length bucket filter dropdown template
  const lengthBucketFilterTemplate = (options: any) => {
    const isFiltered = options.value !== null && options.value !== undefined

    return (
      <div className="flex w-full items-center gap-1">
        <Dropdown
          value={options.value}
          options={[
            { label: 'All', value: null },
            ...lengthBuckets.map((b) => ({ label: b.label, value: b.id })),
          ]}
          onChange={(e) => {
            // Directly update URL instead of using filterCallback
            updateURL({
              length_bucket: e.value || null,
              page: null,
            })
          }}
          placeholder="All"
          className={`p-column-filter text-xs ${isFiltered ? 'border-2 border-un-blue' : ''}`}
          panelClassName="text-xs"
          scrollHeight="200px"
          showClear={false}
          style={{
            width: '100%',
            flex: 1,
            fontSize: '0.75rem',
            height: '1.5rem',
            padding: '0.1rem 0.5rem',
            display: 'flex',
            alignItems: 'center',
          }}
        />
        {isFiltered && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              updateURL({
                length_bucket: null,
                page: null,
              })
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors hover:bg-gray-200"
            title="Clear filter"
          >
            <X className="h-3.5 w-3.5 text-gray-600" />
          </button>
        )}
      </div>
    )
  }

  // Similarity bucket filter function (for PrimeReact)
  const similarityBucketFilter = (
    value: number | null,
    filterValue: string | null
  ): boolean => {
    if (!filterValue) return true

    const bucket = similarityBuckets.find((b) => b.id === filterValue)
    if (!bucket) return true

    if (bucket.min === null && bucket.max === null) return value === null
    if (value === null) return false
    if (bucket.max === null) return value >= bucket.min!

    return value >= bucket.min! && value <= bucket.max
  }

  // Similarity bucket filter dropdown template
  const similarityBucketFilterTemplate = (options: any) => {
    const isFiltered = options.value !== null && options.value !== undefined

    return (
      <div className="flex w-full items-center gap-1">
        <Dropdown
          value={options.value}
          options={[
            { label: 'All', value: null },
            ...similarityBuckets.map((b) => ({ label: b.label, value: b.id })),
          ]}
          onChange={(e) => {
            // Directly update URL instead of using filterCallback
            updateURL({
              similarity_bucket: e.value || null,
              page: null,
            })
          }}
          placeholder="All"
          className={`p-column-filter text-xs ${isFiltered ? 'border-2 border-un-blue' : ''}`}
          panelClassName="text-xs"
          scrollHeight="200px"
          showClear={false}
          style={{
            width: '100%',
            flex: 1,
            fontSize: '0.75rem',
            height: '1.5rem',
            padding: '0.1rem 0.5rem',
            display: 'flex',
            alignItems: 'center',
          }}
        />
        {isFiltered && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              updateURL({
                similarity_bucket: null,
                page: null,
              })
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors hover:bg-gray-200"
            title="Clear filter"
          >
            <X className="h-3.5 w-3.5 text-gray-600" />
          </button>
        )}
      </div>
    )
  }

  // Frequency bucket filter function (for PrimeReact)
  const frequencyBucketFilter = (
    value: number | null,
    filterValue: string | null
  ): boolean => {
    if (!filterValue) return true

    const bucket = frequencyBuckets.find((b) => b.id === filterValue)
    if (!bucket) return true

    // For "one-time" bucket, we need to check series_symbol_count
    // This will be handled server-side, so just return true here
    if (bucket.min === null && bucket.max === null) return true

    if (value === null || value === undefined) return false
    if (bucket.max === null) return value >= bucket.min!

    return value >= bucket.min! && value <= bucket.max
  }

  // Frequency bucket filter dropdown template
  const frequencyBucketFilterTemplate = (options: any) => {
    const isFiltered = options.value !== null && options.value !== undefined

    return (
      <div className="flex w-full items-center gap-1">
        <Dropdown
          value={options.value}
          options={[
            { label: 'All', value: null },
            ...frequencyBuckets.map((b) => ({ label: b.label, value: b.id })),
          ]}
          onChange={(e) => {
            // Directly update URL instead of using filterCallback
            updateURL({
              frequency_bucket: e.value || null,
              page: null,
            })
          }}
          placeholder="All"
          className={`p-column-filter text-xs ${isFiltered ? 'border-2 border-un-blue' : ''}`}
          panelClassName="text-xs"
          scrollHeight="200px"
          showClear={false}
          style={{
            width: '100%',
            flex: 1,
            fontSize: '0.75rem',
            height: '1.5rem',
            padding: '0.1rem 0.5rem',
            display: 'flex',
            alignItems: 'center',
          }}
        />
        {isFiltered && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              updateURL({
                frequency_bucket: null,
                page: null,
              })
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors hover:bg-gray-200"
            title="Clear filter"
          >
            <X className="h-3.5 w-3.5 text-gray-600" />
          </button>
        )}
      </div>
    )
  }

  // Title filter template
  const titleFilterTemplate = (options: any) => {
    const isFiltered =
      options.value !== null &&
      options.value !== undefined &&
      options.value !== ''

    const handleTitleSearch = () => {
      updateURL({
        title_search: titleSearchInput || null,
        page: null,
      })
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleTitleSearch()
      }
    }

    return (
      <div className="flex w-full items-center gap-1">
        <Input
          type="text"
          value={titleSearchInput}
          onChange={(e) => setTitleSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Press Enter to search..."
          className={`h-6 px-2 text-xs ${isFiltered ? 'border-2 border-un-blue' : ''}`}
        />
        {isFiltered && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setTitleSearchInput('')
              updateURL({
                title_search: null,
                page: null,
              })
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors hover:bg-gray-200"
            title="Clear filter"
          >
            <X className="h-3.5 w-3.5 text-gray-600" />
          </button>
        )}
      </div>
    )
  }

  // Title filter function (always return true since filtering is server-side)
  const titleFilter = (): boolean => {
    return true
  }

  // Cell templates
  const titleTemplate = (row: T) => (
    <div
      className="max-w-[20rem] truncate sm:max-w-[24rem] md:max-w-md lg:max-w-lg xl:max-w-160"
      title={row.title || row.combined_title}
    >
      <span className="font-medium">{row.title || row.combined_title}</span>
    </div>
  )

  const symbolTemplate = (row: T) => (
    <div className="font-mono text-sm">
      {row.url ? (
        <a
          href={row.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-un-blue hover:text-un-blue/80 hover:underline"
        >
          {row.symbol}
        </a>
      ) : (
        <span>{row.symbol}</span>
      )}
    </div>
  )

  const yearTemplate = (row: T) => (
    <div>{row.year === 0 ? 'N/A' : row.year}</div>
  )

  const lengthTemplate = (row: T) => {
    if (!row.word_count)
      return (
        <div>
          <span className="text-gray-400">N/A</span>
        </div>
      )
    const roundedCount = Math.round(row.word_count / 50) * 50
    return <div>~{roundedCount.toLocaleString()}</div>
  }

  const recurrenceTemplate = (row: T) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-help text-sm">
          <div className="font-medium">{row.series_symbol_count} total</div>
          <div className="text-muted-foreground">
            {row.series_first_year === 0 || row.series_last_year === 0
              ? 'N/A'
              : row.series_first_year === row.series_last_year
                ? `${row.series_first_year}`
                : `${row.series_first_year}-${row.series_last_year}`}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent className="p-0">
        {row.series_symbol_count > 1 ? (
          <button
            onClick={() => handleSeriesClick(row.normalized_title, row.organ)}
            className="rounded px-3 py-2 text-sm transition-colors hover:bg-gray-100"
          >
            View entire series ({row.series_symbol_count} {config.type})
            <div className="mt-1 text-xs text-gray-500">
              Click to show all in series
            </div>
          </button>
        ) : (
          <p className="px-3 py-2">Standalone {config.type.slice(0, -1)}</p>
        )}
      </TooltipContent>
    </Tooltip>
  )

  const frequencyTemplate = (row: T) => {
    if (row.series_symbol_count === 1) {
      return <div className="text-sm">One-time</div>
    }

    if (
      row.distance_to_previous !== null &&
      row.distance_to_previous !== undefined
    ) {
      const displayText =
        row.distance_to_previous === 0
          ? '<1 year ago'
          : `${row.distance_to_previous} ${row.distance_to_previous === 1 ? 'year' : 'years'} ago`

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help text-sm">{displayText}</div>
          </TooltipTrigger>
          <TooltipContent className="p-0">
            {row.previous_symbol ? (
              <button
                onClick={() => handlePreviousSymbolClick(row.previous_symbol!)}
                className="rounded px-3 py-2 text-sm transition-colors hover:bg-gray-100"
              >
                <span className="font-mono">{row.previous_symbol}</span>
                <div className="mt-1 text-xs text-gray-500">
                  Click to find in table
                </div>
              </button>
            ) : (
              <p className="px-3 py-2">
                No previous {config.type.slice(0, -1)}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      )
    }

    return <div className="text-sm text-gray-400">N/A</div>
  }

  const similarityTemplate = (row: T) => {
    const similarity = row.similarity_to_previous || 0
    if (similarity === null || similarity === 0) {
      return <div className="text-gray-400">N/A</div>
    }

    const red = Math.round(similarity * 255)
    const green = Math.round((1 - similarity) * 255)
    const color = `rgb(${red}, ${green}, 0)`

    let interpretation = ''
    if (similarity < 0.2) interpretation = 'Very different'
    else if (similarity < 0.4) interpretation = 'Somewhat different'
    else if (similarity < 0.6) interpretation = 'Moderately similar'
    else if (similarity < 0.8) interpretation = 'Very similar'
    else interpretation = 'Nearly identical'

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div style={{ color }} className="cursor-help">
            ~{similarity.toFixed(2)}
          </div>
        </TooltipTrigger>
        <TooltipContent className="p-0">
          <div className="p-3">
            <p className="font-medium">{interpretation}</p>
            <p className="mt-1 font-mono text-xs text-gray-500">
              1.00 – identical text
              <br />
              0.00 – completely different
            </p>
            {row.previous_symbol && (
              <div className="mt-2 border-t pt-2">
                <a
                  href={`/diff?symbol1=${encodeURIComponent(row.previous_symbol)}&symbol2=${encodeURIComponent(row.symbol)}`}
                  className="text-sm font-medium text-un-blue hover:text-un-blue/80 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Compare documents →
                </a>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  const withinResourcesTemplate = (row: T) => {
    if (!('has_within_existing_resources' in row)) return null

    const resolution = row as any
    if (
      resolution.has_within_existing_resources === null ||
      resolution.has_within_existing_resources === undefined
    ) {
      return <div className="text-gray-400">N/A</div>
    }

    return (
      <div className="flex items-center gap-2">
        {resolution.has_within_existing_resources ? (
          <Check className="h-4 w-4 text-faded-jade" />
        ) : (
          <X className="h-4 w-4 text-au-chico" />
        )}
        <span className="text-sm text-muted-foreground">
          ({resolution.count_within_existing_resources || 0})
        </span>
      </div>
    )
  }

  const similarityHeaderTemplate = () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help">Similarity</span>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          Levenshtein ratio on character level
          <br />
          of the document fulltexts
        </p>
      </TooltipContent>
    </Tooltip>
  )

  const withinResourcesHeaderTemplate = () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help">Within Resources</span>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          Shows if a resolution includes
          <br />
          "within existing resources" and how often
        </p>
      </TooltipContent>
    </Tooltip>
  )

  const lengthHeaderTemplate = () => (
    <span>
      Length <span className="font-normal text-muted-foreground">[words]</span>
    </span>
  )

  const customPaginatorTemplate = {
    layout:
      'FirstPageLink PrevPageLink NextPageLink LastPageLink CurrentPageReport',
    FirstPageLink: () => (
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageChange({ page: 0, rows: pagination.limit })}
        disabled={pagination.page === 1}
        className="mr-1 h-8 w-8 p-0"
      >
        <ChevronsLeft className="h-3 w-3" />
      </Button>
    ),
    PrevPageLink: () => (
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          handlePageChange({
            page: pagination.page - 2,
            rows: pagination.limit,
          })
        }
        disabled={pagination.page === 1}
        className="mr-1 h-8 w-8 p-0"
      >
        <ChevronLeft className="h-3 w-3" />
      </Button>
    ),
    NextPageLink: () => (
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          handlePageChange({ page: pagination.page, rows: pagination.limit })
        }
        disabled={pagination.page >= pagination.totalPages}
        className="mr-1 h-8 w-8 p-0"
      >
        <ChevronRight className="h-3 w-3" />
      </Button>
    ),
    LastPageLink: () => (
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          handlePageChange({
            page: pagination.totalPages - 1,
            rows: pagination.limit,
          })
        }
        disabled={pagination.page >= pagination.totalPages}
        className="mr-1 h-8 w-8 p-0"
      >
        <ChevronsRight className="h-3 w-3" />
      </Button>
    ),
    CurrentPageReport: () => (
      <div className="mt-2 w-full text-center text-sm text-muted-foreground">
        Page {pagination.page} of {pagination.totalPages} •{' '}
        {pagination.total.toLocaleString()} items total
      </div>
    ),
  }

  if (error) {
    return (
      <div className="relative right-1/2 left-1/2 -mr-[50vw] -ml-[50vw] w-screen">
        <div className="mx-auto max-w-4xl px-8 sm:px-12 lg:max-w-6xl lg:px-16 xl:max-w-7xl">
          <div className="mb-6 flex items-center gap-3">
            <FileText className="h-8 w-8 text-un-blue" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {config.title}
            </h1>
          </div>
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative right-1/2 left-1/2 -mr-[50vw] -ml-[50vw] w-screen">
      {!hideHeader && (
        <div className="mx-auto mb-6 max-w-4xl px-8 pt-8 sm:px-12 lg:max-w-6xl lg:px-16 xl:max-w-7xl">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-un-blue" />
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {config.title}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={searchParams.get('organ') || config.defaultOrgan}
                onValueChange={handleOrganChange}
              >
                <SelectTrigger className="h-9 w-48 border-slate-300 bg-white text-sm focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {config.organOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={searchParams.get('is_recurring_series') || 'all'}
                onValueChange={handleRecurringSeriesChange}
              >
                <SelectTrigger className="h-9 w-52 border-slate-300 bg-white text-sm focus:border-blue-500 focus:ring-blue-500">
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
                className="h-9 border-slate-300 px-3 text-sm"
                title="Reset filters to default"
              >
                <RotateCcw className="mr-1 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto mt-8 max-w-[95vw] overflow-x-auto px-4">
        <DataTable
          value={documents}
          loading={loading}
          stripedRows
          showGridlines
          size="small"
          tableStyle={{ width: '100%', minWidth: '1200px' }}
          paginator
          rows={pagination.limit}
          totalRecords={pagination.total}
          lazy
          onPage={handlePageChange}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          removableSort
          filters={filters}
          onFilter={handleFilterChange}
          filterDisplay="row"
          className="custom-table"
          paginatorTemplate={customPaginatorTemplate}
        >
          {config.columns.symbol && (
            <Column
              field="symbol"
              header="Symbol"
              body={symbolTemplate}
              sortable
              headerClassName="whitespace-nowrap"
              style={{ width: '8rem' }}
            />
          )}
          {config.columns.year && (
            <Column
              field="year"
              header="Session Year"
              body={yearTemplate}
              sortable
              style={{ width: '5rem' }}
            />
          )}
          {config.columns.title && (
            <Column
              field="title"
              header="Title"
              body={titleTemplate}
              sortable
              filter
              filterElement={titleFilterTemplate}
              filterFunction={titleFilter}
              filterField="title"
              showFilterMenu={false}
              style={{ width: '20rem', maxWidth: '20rem' }}
            />
          )}
          {config.columns.length && (
            <Column
              field="word_count"
              header={lengthHeaderTemplate}
              body={lengthTemplate}
              sortable
              filter
              filterElement={lengthBucketFilterTemplate}
              filterFunction={lengthBucketFilter}
              filterField="length_bucket"
              showFilterMenu={false}
              headerClassName="whitespace-nowrap"
              style={{ width: '10rem' }}
            />
          )}
          {config.columns.recurrence && (
            <Column
              field="series_symbol_count"
              header="Recurrence"
              body={recurrenceTemplate}
              sortable
              headerClassName="whitespace-nowrap"
              style={{ width: '8rem' }}
            />
          )}
          {config.columns.previous && (
            <Column
              header="Previous"
              body={frequencyTemplate}
              filter
              filterElement={frequencyBucketFilterTemplate}
              filterFunction={frequencyBucketFilter}
              filterField="frequency_bucket"
              showFilterMenu={false}
              headerClassName="whitespace-nowrap"
              style={{ width: '10rem' }}
            />
          )}
          {config.columns.similarity && (
            <Column
              field="similarity_to_previous"
              header={similarityHeaderTemplate}
              body={similarityTemplate}
              sortable
              filter
              filterElement={similarityBucketFilterTemplate}
              filterFunction={similarityBucketFilter}
              filterField="similarity_bucket"
              showFilterMenu={false}
              headerClassName="whitespace-nowrap"
              style={{ width: '10rem' }}
            />
          )}
          {config.columns.withinResources && (
            <Column
              header={withinResourcesHeaderTemplate}
              body={withinResourcesTemplate}
              headerClassName="whitespace-nowrap"
              style={{ width: '9rem' }}
            />
          )}
        </DataTable>
      </div>
    </div>
  )
}
