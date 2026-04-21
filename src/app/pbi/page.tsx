'use client'

import {
    ArrowDown,
    ArrowLeftRight,
    ArrowUp,
    ChevronDown,
    ChevronRight,
    DollarSign,
    ExternalLink,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'

type SortField = 'resolution' | 'amount'
type SortDirection = 'asc' | 'desc'

interface PBIStage {
  committee: string
  symbol: string
  amount: number | null
  publication_date: string | null
  document_type: string
  notes: string | null
  posts_count: number | null
  posts_levels: string | null
  budget_section: string | null
  is_recurring: boolean
  has_multiyear: boolean
}

interface PBIResolution {
  referenced_resolution: string
  title: string
  stages: PBIStage[]
  plenary_amount: number | null
  total_by_committee: { [key: string]: number }
  year: number | null
}

interface YearGroup {
  year: number
  items: PBIResolution[]
  total: number
}

function formatAmount(amount: number | null): string {
  if (amount === null || amount < 0) return 'N/A'
  return `$${amount.toLocaleString()}`
}

function extractResolutionTitle(pbiTitle: string): string {
  // Extract the subject from PBI title (part before ":" or before "programme budget")
  const colonMatch = pbiTitle.match(/^([^:]+)/)
  if (colonMatch) {
    return colonMatch[1].trim()
  }
  const pbiMatch = pbiTitle.match(/^(.+?)\s*:\s*programme budget/i)
  if (pbiMatch) {
    return pbiMatch[1].trim()
  }
  return pbiTitle.substring(0, 150)
}

function getCommitteeOrder(committee: string): number {
  // Define workflow order for sorting (Main Committee -> Fifth Committee -> ACABQ -> Plenary)
  const order: { [key: string]: number } = {
    '1': 1,
    '2': 1,
    '3': 1,
    '4': 1,
    '6': 1, // Main Committees
    '5': 10, // Fifth Committee
    ACABQ: 20,
    Plenary: 30,
  }
  return order[committee] || 99
}

// Parse resolution symbol to extract committee and L. number for sorting
function parseResolutionSymbol(symbol: string): {
  committee: number
  lNumber: number
} {
  // Pattern: A/C.{committee}/{session}/L.{number} or A/{session}/L.{number}
  const committeeMatch = symbol.match(/A\/C\.(\d)\//)
  const lNumberMatch = symbol.match(/L\.(\d+)/)

  // Committee: 0 = Plenary, 1-6 = Committee number
  const committee = committeeMatch ? parseInt(committeeMatch[1], 10) : 0
  const lNumber = lNumberMatch ? parseInt(lNumberMatch[1], 10) : 0

  return { committee, lNumber }
}

// Sort resolutions by committee (Plenary first, then C.1-C.6) then by L. number
function compareResolutionSymbols(a: string, b: string): number {
  const parsedA = parseResolutionSymbol(a)
  const parsedB = parseResolutionSymbol(b)

  // First by committee (0=Plenary comes first, then 1-6)
  if (parsedA.committee !== parsedB.committee) {
    return parsedA.committee - parsedB.committee
  }
  // Then by L. number
  return parsedA.lNumber - parsedB.lNumber
}

// Helper to get stage display names based on document type
function getStageLabel(stage: PBIStage, short: boolean = false): string {
  const committee = stage.committee
  const docType = stage.document_type

  if (committee === 'Plenary') {
    if (docType === 'fifth_committee_decision') {
      return short ? 'C.5→GA' : 'Fifth Committee Report to GA'
    }
    return short ? 'C.5→GA' : 'Fifth Committee Report to GA'
  }
  if (committee === 'ACABQ') {
    return short ? 'ACABQ' : 'ACABQ Advisory Report'
  }
  if (committee === '5') {
    return short ? 'SG→C.5' : 'SG Statement to Fifth Committee'
  }
  // Main committees - SG statements TO the committee
  const committeeNames: { [key: string]: string } = {
    '1': 'First Committee (Disarmament)',
    '2': 'Second Committee (Economic & Financial)',
    '3': 'Third Committee (Social & Humanitarian)',
    '4': 'Fourth Committee (Political & Decolonization)',
    '6': 'Sixth Committee (Legal)',
  }
  const committeeName = committeeNames[committee] || `Committee ${committee}`
  return short ? `SG→C.${committee}` : `SG Statement to ${committeeName}`
}

interface YearTableProps {
  yearGroup: YearGroup
  expandedRows: Set<string>
  toggleRow: (resolution: string) => void
  sortField: SortField
  sortDirection: SortDirection
  onSort: (field: SortField) => void
}

function SortHeader({
  field,
  currentField,
  direction,
  onSort,
  align = 'left',
  children,
}: {
  field: SortField
  currentField: SortField
  direction: SortDirection
  onSort: (field: SortField) => void
  align?: 'left' | 'right'
  children: React.ReactNode
}) {
  const isActive = field === currentField
  return (
    <th
      className={`cursor-pointer px-4 py-2 text-xs font-medium tracking-wider whitespace-nowrap text-gray-500 uppercase select-none ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {align === 'right' &&
          isActive &&
          (direction === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          ))}
        {children}
        {align === 'left' &&
          isActive &&
          (direction === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          ))}
      </span>
    </th>
  )
}

function YearTable({
  yearGroup,
  expandedRows,
  toggleRow,
  sortField,
  sortDirection,
  onSort,
}: YearTableProps) {
  const { year, items, total } = yearGroup

  // Sort items based on current sort settings
  const sortedItems = useMemo(() => {
    const sorted = [...items]
    if (sortField === 'resolution') {
      sorted.sort((a, b) =>
        compareResolutionSymbols(
          a.referenced_resolution,
          b.referenced_resolution
        )
      )
    } else {
      sorted.sort((a, b) => (b.plenary_amount || 0) - (a.plenary_amount || 0))
    }
    if (sortDirection === 'asc') {
      sorted.reverse()
    }
    return sorted
  }, [items, sortField, sortDirection])

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      {/* Year header bar */}
      <div className="flex items-center justify-between border-b bg-un-blue/10 px-4 py-3">
        <span className="text-lg font-bold text-un-blue">
          {year === 0 ? 'Unknown Year' : year}
        </span>
        <span className="text-sm font-semibold text-gray-700">
          Total: <span className="text-un-blue">{formatAmount(total)}</span>
        </span>
      </div>

      <table className="w-full">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="w-8 px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"></th>
            <SortHeader
              field="resolution"
              currentField={sortField}
              direction={sortDirection}
              onSort={onSort}
            >
              Draft Resolution
            </SortHeader>
            <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              Title
            </th>
            <SortHeader
              field="amount"
              currentField={sortField}
              direction={sortDirection}
              onSort={onSort}
              align="right"
            >
              GA Approved
            </SortHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedItems.map((item) => {
            const isExpanded = expandedRows.has(item.referenced_resolution)
            // Sort stages in workflow order
            const sortedStages = [...item.stages].sort((a, b) => {
              const orderA = getCommitteeOrder(a.committee)
              const orderB = getCommitteeOrder(b.committee)
              if (orderA !== orderB) return orderA - orderB
              // Secondary sort by date
              const dateA = a.publication_date || ''
              const dateB = b.publication_date || ''
              return dateA.localeCompare(dateB)
            })

            const resolutionTitle = extractResolutionTitle(item.title)

            return (
              <Fragment key={item.referenced_resolution}>
                <tr className="hover:bg-gray-50">
                  <td
                    className="cursor-pointer px-4 py-3"
                    onClick={() => toggleRow(item.referenced_resolution)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`https://docs.un.org/en/${item.referenced_resolution}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono text-sm text-un-blue hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.referenced_resolution}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td
                    className="cursor-pointer px-4 py-3 text-sm text-gray-700"
                    onClick={() => toggleRow(item.referenced_resolution)}
                  >
                    {resolutionTitle}
                  </td>
                  <td
                    className="cursor-pointer px-4 py-3 text-right text-sm font-medium"
                    onClick={() => toggleRow(item.referenced_resolution)}
                  >
                    {formatAmount(item.plenary_amount)}
                  </td>
                </tr>

                {isExpanded && (
                  <tr key={`${item.referenced_resolution}-expanded`}>
                    <td colSpan={4} className="bg-gray-100 px-4 py-4">
                      <div className="space-y-3">
                        <div className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                          Workflow Stages
                        </div>

                        <div className="overflow-hidden rounded-lg border bg-white">
                          <table className="w-full text-sm">
                            <tbody className="divide-y divide-gray-200">
                              {sortedStages.map((stage, idx) => {
                                const prevStage =
                                  idx > 0 ? sortedStages[idx - 1] : null
                                const prevName = prevStage
                                  ? getStageLabel(prevStage, true)
                                  : null

                                return (
                                  <tr key={idx}>
                                    <td className="w-8 px-3 py-2">
                                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-un-blue/10 text-xs font-bold text-un-blue">
                                        {idx + 1}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className="font-semibold whitespace-nowrap text-gray-700">
                                        {getStageLabel(stage)}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <a
                                        href={`https://docs.un.org/en/${stage.symbol}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 font-mono text-xs whitespace-nowrap text-un-blue hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {stage.symbol}
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </td>
                                    <td className="px-3 py-2">
                                      {stage.posts_count && (
                                        <span className="text-xs whitespace-nowrap text-gray-500">
                                          {stage.posts_count} posts
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      {prevStage && (
                                        <a
                                          href={`/diff?symbol1=${encodeURIComponent(prevStage.symbol)}&symbol2=${encodeURIComponent(stage.symbol)}`}
                                          className="inline-flex items-center gap-1 rounded bg-un-blue/10 px-2 py-0.5 text-xs whitespace-nowrap text-un-blue hover:bg-un-blue/20"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <ArrowLeftRight className="h-3 w-3" />
                                          vs {prevName}
                                        </a>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <span className="font-medium whitespace-nowrap text-gray-900">
                                        {formatAmount(stage.amount)}
                                      </span>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function PBIPage() {
  const [data, setData] = useState<PBIResolution[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('resolution')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      // New field: resolution defaults to asc, amount defaults to desc
      setSortField(field)
      setSortDirection(field === 'resolution' ? 'asc' : 'desc')
    }
  }

  useEffect(() => {
    fetch('/data/pbi_dashboard.json')
      .then((res) => res.json())
      .then((rawData: PBIResolution[]) => {
        setData(rawData)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load PBI data:', err)
        setLoading(false)
      })
  }, [])

  // Group data by year
  const yearGroups = useMemo(() => {
    const grouped = data.reduce(
      (acc, item) => {
        const year = item.year || 0
        if (!acc[year]) {
          acc[year] = { year, items: [], total: 0 }
        }
        acc[year].items.push(item)
        acc[year].total += item.plenary_amount || 0
        return acc
      },
      {} as Record<number, YearGroup>
    )

    // Sort years descending (with 0/unknown at the end)
    return Object.values(grouped).sort((a, b) => {
      if (a.year === 0) return 1
      if (b.year === 0) return -1
      return b.year - a.year
    })
  }, [data])

  const toggleRow = (resolution: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(resolution)) {
      newExpanded.delete(resolution)
    } else {
      newExpanded.add(resolution)
    }
    setExpandedRows(newExpanded)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="py-8 text-center">
          <div className="inline-flex items-center gap-2 text-gray-600">
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-un-blue"></div>
            Loading PBI data...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="space-y-4">
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <DollarSign className="h-6 w-6 text-un-blue" />
          Programme Budget Implications
        </h1>

        <p className="text-sm text-gray-500">
          Data has been automatically extracted from official UN documents.
          Please consult the original documents for authoritative information.
        </p>
      </div>

      <div className="space-y-6">
        {yearGroups.map((yearGroup) => (
          <YearTable
            key={yearGroup.year}
            yearGroup={yearGroup}
            expandedRows={expandedRows}
            toggleRow={toggleRow}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        ))}
      </div>
    </div>
  )
}
