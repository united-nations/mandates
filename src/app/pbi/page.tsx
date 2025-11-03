'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, DollarSign, ArrowLeftRight, ExternalLink } from 'lucide-react'

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
    '1': 1, '2': 1, '3': 1, '4': 1, '6': 1, // Main Committees
    '5': 10, // Fifth Committee
    'ACABQ': 20,
    'Plenary': 30
  }
  return order[committee] || 99
}

export default function PBIPage() {
  const [data, setData] = useState<PBIResolution[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/data/pbi_dashboard.json')
      .then(res => res.json())
      .then((rawData: PBIResolution[]) => {
        // Sort by year (desc), then by plenary amount (desc)
        const sortedData = [...rawData].sort((a, b) => {
          // Year descending (nulls last)
          const yearA = a.year || 0
          const yearB = b.year || 0
          if (yearB !== yearA) return yearB - yearA
          
          // Amount descending
          const amountA = a.plenary_amount || 0
          const amountB = b.plenary_amount || 0
          return amountB - amountA
        })
        
        setData(sortedData)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load PBI data:', err)
        setLoading(false)
      })
  }, [])

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
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-un-blue"></div>
            Loading PBI data...
          </div>
        </div>
      </div>
    )
  }

  const totalPlenaryAmount = data.reduce((sum, item) => 
    sum + (item.plenary_amount || 0), 0
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-un-blue" />
          Programme Budget Implications
        </h1>

        <div className="bg-muted/30 rounded-lg p-4">
          <div className="text-sm text-gray-600">
            <span className="font-semibold">{data.length}</span> draft resolutions with budget implications
          </div>
          <div className="text-lg font-semibold text-un-blue mt-1">
            Total GA Approved: {formatAmount(totalPlenaryAmount)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Year
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resolution
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                GA Approved
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((item) => {
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
                <>
                  <tr 
                    key={item.referenced_resolution}
                    className="hover:bg-gray-50"
                  >
                    <td 
                      className="px-4 py-3 cursor-pointer"
                      onClick={() => toggleRow(item.referenced_resolution)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </td>
                    <td 
                      className="px-4 py-3 text-sm text-gray-600 cursor-pointer"
                      onClick={() => toggleRow(item.referenced_resolution)}
                    >
                      {item.year || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`https://docs.un.org/en/${item.referenced_resolution}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-un-blue hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.referenced_resolution}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td 
                      className="px-4 py-3 text-sm text-gray-700 cursor-pointer"
                      onClick={() => toggleRow(item.referenced_resolution)}
                    >
                      {resolutionTitle}
                    </td>
                    <td 
                      className="px-4 py-3 text-right text-sm font-medium cursor-pointer"
                      onClick={() => toggleRow(item.referenced_resolution)}
                    >
                      {formatAmount(item.plenary_amount)}
                    </td>
                  </tr>
                  
                  {isExpanded && (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 bg-gray-50">
                        <div className="space-y-3">
                          {/* Show budget section at top */}
                          {(() => {
                            const budgetSection = sortedStages.find(s => s.budget_section)?.budget_section
                            return budgetSection ? (
                              <div className="text-xs text-gray-600 mb-2">
                                {budgetSection}
                              </div>
                            ) : null
                          })()}
                          
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Workflow Stages
                          </div>
                          
                          <div className="bg-white rounded-lg border overflow-hidden">
                            <table className="w-full text-sm">
                              <tbody className="divide-y divide-gray-200">
                                {sortedStages.map((stage, idx) => {
                                  const prevStage = idx > 0 ? sortedStages[idx - 1] : null
                                  
                                  // Helper to get stage display names based on document type
                                  const getStageLabel = (stage: PBIStage, short: boolean = false) => {
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
                                    const committeeNames: {[key: string]: string} = {
                                      '1': 'First Committee (Disarmament)',
                                      '2': 'Second Committee (Economic & Financial)',
                                      '3': 'Third Committee (Social & Humanitarian)',
                                      '4': 'Fourth Committee (Political & Decolonization)',
                                      '6': 'Sixth Committee (Legal)'
                                    }
                                    const committeeName = committeeNames[committee] || `Committee ${committee}`
                                    return short ? `SG→C.${committee}` : `SG Statement to ${committeeName}`
                                  }
                                  
                                  const prevName = prevStage ? getStageLabel(prevStage, true) : null
                                  
                                  return (
                                    <tr key={idx}>
                                      <td className="px-3 py-2 w-8">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-un-blue/10 text-un-blue text-xs font-bold">
                                          {idx + 1}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2">
                                        <span className="font-semibold text-gray-700 whitespace-nowrap">
                                          {getStageLabel(stage)}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2">
                                        <a
                                          href={`https://docs.un.org/en/${stage.symbol}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-mono text-xs text-un-blue hover:underline flex items-center gap-1 whitespace-nowrap"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {stage.symbol}
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      </td>
                                      <td className="px-3 py-2">
                                        {stage.posts_count && (
                                          <span className="text-xs text-gray-500 whitespace-nowrap">
                                            {stage.posts_count} posts
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2">
                                        {prevStage && (
                                          <a
                                            href={`/diff?symbol1=${encodeURIComponent(prevStage.symbol)}&symbol2=${encodeURIComponent(stage.symbol)}`}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-un-blue/10 text-un-blue hover:bg-un-blue/20 rounded whitespace-nowrap"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <ArrowLeftRight className="h-3 w-3" />
                                            vs {prevName}
                                          </a>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        <span className="font-medium text-gray-900 whitespace-nowrap">
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
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

