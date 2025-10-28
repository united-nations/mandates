'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronRight, Search, LayoutList, LayoutGrid, Download, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react'
import type { Report } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HierarchicalSelect, type HierarchicalOption } from '@/components/ui/hierarchical-select'

interface ClusterMetadata {
  cluster_titles: Record<string, string>
  cluster_details: Record<string, {
    title: string
    description: string
    theme?: string
    suggestion?: string
  }>
}

export function ReportsExplorer() {
  const [reports, setReports] = useState<Report[]>([])
  const [clusterMetadata, setClusterMetadata] = useState<ClusterMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'cluster'>('cluster')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrgans, setSelectedOrgans] = useState<Set<string>>(new Set())
  const [selectedDocumentTypes, setSelectedDocumentTypes] = useState<Set<string>>(new Set())
  const [selectedAuthors, setSelectedAuthors] = useState<Set<string>>(new Set())
  const [yearRange, setYearRange] = useState<[number, number]>([2020, 2025])
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set())
  const [expandedSimilar, setExpandedSimilar] = useState<Set<string>>(new Set())
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(new Set())
  const [clusterSort, setClusterSort] = useState<'size' | 'similarity'>('size')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)

  // Load reports data and cluster metadata
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Fetch all reports by setting a very high limit
        const [reportsResponse, metadataResponse] = await Promise.all([
          fetch('/api/reports?limit=99999'),
          fetch('/data/cluster_metadata.json')
        ])
        
        if (!reportsResponse.ok) {
          throw new Error('Failed to load reports data')
        }
        
        const reportsData = await reportsResponse.json()
        const metadata = metadataResponse.ok ? await metadataResponse.json() : null
        
        setReports(reportsData.data || [])
        setClusterMetadata(metadata)
      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // Get hierarchical organ options with counts based on other active filters
  const organOptions = useMemo((): HierarchicalOption[] => {
    const organMap = new Map<string, Map<string, {prefix: string, count: number}>>()
    
    // Filter reports by all filters EXCEPT organ
    const reportsForCounts = reports.filter(report => {
      if (!report.is_latest_version) return false
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesSearch = 
          report.combined_title?.toLowerCase().includes(term) ||
          report.title?.toLowerCase().includes(term) ||
          report.symbol?.toLowerCase().includes(term) ||
          report.normalized_title?.toLowerCase().includes(term)
        if (!matchesSearch) return false
      }
      if (selectedDocumentTypes.size > 0) {
        const subtype = report.document_subtype || report.document_type
        const typeKey = `${report.document_type}|${subtype}`
        if (!selectedDocumentTypes.has(typeKey)) return false
      }
      if (selectedAuthors.size > 0) {
        const level2 = report.author_level2 || report.author_level1
        const authorKey = `${report.author_level1}|${level2}`
        if (!selectedAuthors.has(authorKey)) return false
      }
      if (report.year && (report.year < yearRange[0] || report.year > yearRange[1])) return false
      return true
    })
    
    reportsForCounts.forEach(report => {
      if (report.organ_level1 && report.organ_level2) {
        if (!organMap.has(report.organ_level1)) {
          organMap.set(report.organ_level1, new Map())
        }
        const level2Map = organMap.get(report.organ_level1)!
        const existing = level2Map.get(report.organ_level2)
        if (existing) {
          existing.count++
        } else {
          level2Map.set(report.organ_level2, { 
            prefix: report.organ_prefix || '', 
            count: 1 
          })
        }
      }
    })
    
    const options: HierarchicalOption[] = []
    organMap.forEach((level2Map, level1) => {
      level2Map.forEach((data, level2) => {
        options.push({ level1, level2, prefix: data.prefix, count: data.count })
      })
    })
    
    return options
  }, [reports, searchTerm, selectedDocumentTypes, selectedAuthors, yearRange])

  // Get hierarchical document type options with counts based on other active filters
  const documentTypeOptions = useMemo((): HierarchicalOption[] => {
    const typeMap = new Map<string, Map<string, number>>()
    
    // Filter reports by all filters EXCEPT document type
    const reportsForCounts = reports.filter(report => {
      if (!report.is_latest_version) return false
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesSearch = 
          report.combined_title?.toLowerCase().includes(term) ||
          report.title?.toLowerCase().includes(term) ||
          report.symbol?.toLowerCase().includes(term) ||
          report.normalized_title?.toLowerCase().includes(term)
        if (!matchesSearch) return false
      }
      if (selectedOrgans.size > 0) {
        const organKey = `${report.organ_level1}|${report.organ_level2}`
        if (!selectedOrgans.has(organKey)) return false
      }
      if (selectedAuthors.size > 0) {
        const level2 = report.author_level2 || report.author_level1
        const authorKey = `${report.author_level1}|${level2}`
        if (!selectedAuthors.has(authorKey)) return false
      }
      if (report.year && (report.year < yearRange[0] || report.year > yearRange[1])) return false
      return true
    })
    
    reportsForCounts.forEach(report => {
      if (report.document_type) {
        if (!typeMap.has(report.document_type)) {
          typeMap.set(report.document_type, new Map())
        }
        const subtypeMap = typeMap.get(report.document_type)!
        const subtype = report.document_subtype || 'None'
        subtypeMap.set(subtype, (subtypeMap.get(subtype) || 0) + 1)
      }
    })
    
    const options: HierarchicalOption[] = []
    typeMap.forEach((subtypeMap, type) => {
      subtypeMap.forEach((count, subtype) => {
        options.push({ 
          level1: type, 
          level2: subtype === 'None' ? type : subtype,
          prefix: '',
          count 
        })
      })
    })
    
    return options.sort((a, b) => a.level1.localeCompare(b.level1))
  }, [reports, searchTerm, selectedOrgans, selectedAuthors, yearRange])

  // Get hierarchical author options with counts based on other active filters
  const authorOptions = useMemo((): HierarchicalOption[] => {
    const authorMap = new Map<string, Map<string, number>>()
    
    // Filter reports by all filters EXCEPT author
    const reportsForCounts = reports.filter(report => {
      if (!report.is_latest_version) return false
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesSearch = 
          report.combined_title?.toLowerCase().includes(term) ||
          report.title?.toLowerCase().includes(term) ||
          report.symbol?.toLowerCase().includes(term) ||
          report.normalized_title?.toLowerCase().includes(term)
        if (!matchesSearch) return false
      }
      if (selectedOrgans.size > 0) {
        const organKey = `${report.organ_level1}|${report.organ_level2}`
        if (!selectedOrgans.has(organKey)) return false
      }
      if (selectedDocumentTypes.size > 0) {
        const subtype = report.document_subtype || report.document_type
        const typeKey = `${report.document_type}|${subtype}`
        if (!selectedDocumentTypes.has(typeKey)) return false
      }
      if (report.year && (report.year < yearRange[0] || report.year > yearRange[1])) return false
      return true
    })
    
    reportsForCounts.forEach(report => {
      if (report.author_level1) {
        if (!authorMap.has(report.author_level1)) {
          authorMap.set(report.author_level1, new Map())
        }
        const level2Map = authorMap.get(report.author_level1)!
        const level2 = report.author_level2 || report.author_level1
        level2Map.set(level2, (level2Map.get(level2) || 0) + 1)
      }
    })
    
    const options: HierarchicalOption[] = []
    authorMap.forEach((level2Map, level1) => {
      level2Map.forEach((count, level2) => {
        options.push({ level1, level2, prefix: '', count })
      })
    })
    
    return options.sort((a, b) => a.level1.localeCompare(b.level1))
  }, [reports, searchTerm, selectedOrgans, selectedDocumentTypes, yearRange])

  // Filter reports based on selection
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      // Only show latest versions in main view
      if (!report.is_latest_version) return false

      // Keyword search
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesSearch = 
          report.combined_title?.toLowerCase().includes(term) ||
          report.title?.toLowerCase().includes(term) ||
          report.symbol?.toLowerCase().includes(term) ||
          report.normalized_title?.toLowerCase().includes(term)
        if (!matchesSearch) return false
      }

      // Organ filter (hierarchical)
      if (selectedOrgans.size > 0) {
        const organKey = `${report.organ_level1}|${report.organ_level2}`
        if (!selectedOrgans.has(organKey)) return false
      }

      // Document type filter (hierarchical)
      if (selectedDocumentTypes.size > 0) {
        const subtype = report.document_subtype || report.document_type
        const typeKey = `${report.document_type}|${subtype}`
        if (!selectedDocumentTypes.has(typeKey)) return false
      }

      // Author filter (hierarchical)
      if (selectedAuthors.size > 0) {
        const level2 = report.author_level2 || report.author_level1
        const authorKey = `${report.author_level1}|${level2}`
        if (!selectedAuthors.has(authorKey)) return false
      }

      // Year range filter
      if (report.year && (report.year < yearRange[0] || report.year > yearRange[1])) return false

      return true
    })
  }, [reports, searchTerm, selectedOrgans, selectedDocumentTypes, selectedAuthors, yearRange])

  // Group reports by cluster for cluster view
  const clusteredReports = useMemo(() => {
    const clusters = new Map<number, Report[]>()
    const unclustered: Report[] = []

    filteredReports.forEach(report => {
      if (report.cluster_id !== null && report.cluster_id !== undefined) {
        if (!clusters.has(report.cluster_id)) {
          clusters.set(report.cluster_id, [])
        }
        clusters.get(report.cluster_id)!.push(report)
      } else {
        unclustered.push(report)
      }
    })

    // Sort clusters by size or similarity
    const sortedClusters = Array.from(clusters.entries()).sort((a, b) => {
      if (clusterSort === 'size') {
        return b[1].length - a[1].length
      } else {
        const simA = a[1][0]?.cluster_mean_similarity || 0
        const simB = b[1][0]?.cluster_mean_similarity || 0
        return simB - simA
      }
    })

    return { 
      clusters: new Map(sortedClusters), 
      unclustered 
    }
  }, [filteredReports, clusterSort])

  // Calculate statistics based on filtered data
  const stats = useMemo(() => {
    const totalLatest = filteredReports.length
    const totalClustered = filteredReports.filter(r => r.cluster_id !== null).length
    const totalSeries = new Set(filteredReports.filter(r => r.is_recurring_series).map(r => r.normalized_title)).size
    const avgSimilarity = clusteredReports.clusters.size > 0
      ? Array.from(clusteredReports.clusters.values())
          .map(cluster => cluster[0]?.cluster_mean_similarity || 0)
          .reduce((a, b) => a + b, 0) / clusteredReports.clusters.size
      : 0

    return {
      totalLatest,
      totalClustered,
      totalSeries,
      avgSimilarity,
      numClusters: clusteredReports.clusters.size,
      unclustered: clusteredReports.unclustered.length
    }
  }, [filteredReports, clusteredReports])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedOrgans, selectedDocumentTypes, selectedAuthors, yearRange, viewMode])

  // Check if any filters are active
  const hasActiveFilters = searchTerm || selectedOrgans.size > 0 || selectedDocumentTypes.size > 0 || selectedAuthors.size > 0 || yearRange[0] !== 2020 || yearRange[1] !== 2025

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setSelectedOrgans(new Set())
    setSelectedDocumentTypes(new Set())
    setSelectedAuthors(new Set())
    setYearRange([2020, 2025])
  }

  // Get all reports in a series
  const getSeriesReports = (normalizedTitle: string, organ: string) => {
    return reports.filter(r => 
      r.normalized_title === normalizedTitle && 
      r.organ === organ &&
      !r.is_latest_version
    ).sort((a, b) => (b.year || 0) - (a.year || 0))
  }

  // Get similar reports
  const getSimilarReports = (report: Report) => {
    if (!report.top10_similar_symbols || !report.top10_similar_scores) return []
    
    return report.top10_similar_symbols
      .map((symbol, idx) => ({
        report: reports.find(r => r.symbol === symbol),
        score: report.top10_similar_scores![idx]
      }))
      .filter(item => item.report)
      .map(item => ({ ...item.report!, similarity: item.score }))
  }

  const toggleSeriesExpansion = (symbol: string) => {
    const newExpanded = new Set(expandedSeries)
    if (newExpanded.has(symbol)) {
      newExpanded.delete(symbol)
    } else {
      newExpanded.add(symbol)
    }
    setExpandedSeries(newExpanded)
  }

  const toggleSimilarExpansion = (symbol: string) => {
    const newExpanded = new Set(expandedSimilar)
    if (newExpanded.has(symbol)) {
      newExpanded.delete(symbol)
    } else {
      newExpanded.add(symbol)
    }
    setExpandedSimilar(newExpanded)
  }

  const toggleClusterExpansion = (clusterId: number) => {
    const newExpanded = new Set(expandedClusters)
    if (newExpanded.has(clusterId)) {
      newExpanded.delete(clusterId)
    } else {
      newExpanded.add(clusterId)
    }
    setExpandedClusters(newExpanded)
  }

  // Pagination logic - different for list vs cluster view
  const paginatedData = useMemo(() => {
    if (viewMode === 'list') {
      // In list view: paginate reports
      const start = (currentPage - 1) * itemsPerPage
      const end = start + itemsPerPage
      return {
        items: filteredReports.slice(start, end),
        totalItems: filteredReports.length,
        totalPages: Math.ceil(filteredReports.length / itemsPerPage),
        type: 'reports' as const
      }
    } else {
      // In cluster view: sort and paginate clusters
      const clusterArray = Array.from(clusteredReports.clusters.entries())
      
      // Apply sorting
      const sortedClusters = clusterArray.sort((a, b) => {
        if (clusterSort === 'size') {
          return b[1].length - a[1].length
        } else {
          // Sort by average similarity (higher = more similar)
          const avgSimA = a[1].reduce((sum, r) => sum + (r.cluster_similarity || 0), 0) / a[1].length
          const avgSimB = b[1].reduce((sum, r) => sum + (r.cluster_similarity || 0), 0) / b[1].length
          return avgSimB - avgSimA
        }
      })
      
      // Paginate
      const start = (currentPage - 1) * itemsPerPage
      const end = start + itemsPerPage
      return {
        items: sortedClusters.slice(start, end),
        totalItems: clusteredReports.clusters.size,
        totalPages: Math.ceil(clusteredReports.clusters.size / itemsPerPage),
        type: 'clusters' as const
      }
    }
  }, [viewMode, filteredReports, clusteredReports, currentPage, itemsPerPage, clusterSort])

  const exportClusterAnalysis = () => {
    const analysis = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalReports: stats.totalLatest,
        totalClusters: stats.numClusters,
        avgSimilarity: stats.avgSimilarity
      },
      clusters: Array.from(clusteredReports.clusters.entries()).map(([clusterId, reports]) => ({
        id: clusterId,
        title: clusterMetadata?.cluster_details?.[clusterId.toString()]?.title || `Cluster ${clusterId}`,
        description: clusterMetadata?.cluster_details?.[clusterId.toString()]?.description,
        suggestion: clusterMetadata?.cluster_details?.[clusterId.toString()]?.suggestion,
        size: reports.length,
        similarity: reports[0]?.cluster_mean_similarity || 0,
        reports: reports.map(r => ({
          symbol: r.symbol,
          title: r.combined_title || r.title,
          year: r.year,
          organ: r.organ,
          document_type: r.document_type,
          document_subtype: r.document_subtype,
          author_level1: r.author_level1,
          author_level2: r.author_level2,
          word_count: r.word_count
        }))
      }))
    }

    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `un-reports-cluster-analysis-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const PaginationControls = () => {
    const { totalPages, totalItems, type } = paginatedData
    const start = (currentPage - 1) * itemsPerPage + 1
    const end = Math.min(currentPage * itemsPerPage, totalItems)

    if (totalPages <= 1) return null

    const pageNumbers = []
    const maxButtons = 7
    
    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pageNumbers.push(i)
        pageNumbers.push(-1) // ellipsis
        pageNumbers.push(totalPages)
      } else if (currentPage >= totalPages - 3) {
        pageNumbers.push(1)
        pageNumbers.push(-1)
        for (let i = totalPages - 4; i <= totalPages; i++) pageNumbers.push(i)
      } else {
        pageNumbers.push(1)
        pageNumbers.push(-1)
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pageNumbers.push(i)
        pageNumbers.push(-1)
        pageNumbers.push(totalPages)
      }
    }

    return (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg mt-4">
        <div className="flex flex-1 justify-between sm:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{start}</span> to <span className="font-medium">{end}</span> of{' '}
              <span className="font-medium">{totalItems}</span> {type}
            </p>
            <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
                <SelectItem value="200">200 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {pageNumbers.map((pageNum, idx) => (
              pageNum === -1 ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">...</span>
              ) : (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="w-9"
                >
                  {pageNum}
                </Button>
              )
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const ReportCard = ({ report, isNested = false }: { report: Report; isNested?: boolean }) => {
    const seriesReports = isNested ? [] : getSeriesReports(report.normalized_title || '', report.organ || '')
    const similarReports = isNested ? [] : getSimilarReports(report)
    const isSeriesExpanded = expandedSeries.has(report.symbol || '')
    const isSimilarExpanded = expandedSimilar.has(report.symbol || '')

    return (
      <div className={`border rounded-lg p-4 ${isNested ? 'bg-gray-50 border-gray-200' : 'bg-white'} mb-2`}>
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="mb-3">
              <h3 className="font-semibold text-lg text-gray-900 mb-1">
                {report.combined_title || report.title}
              </h3>
              {report.subtitle && (
                <p className="text-sm text-gray-600 italic">{report.subtitle}</p>
              )}
              {report.statement_of_responsibility && report.statement_of_responsibility.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {report.statement_of_responsibility.join('; ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-mono text-xs text-gray-500">{report.symbol}</span>
              {report.year && <Badge variant="outline" className="text-xs">{report.year}</Badge>}
              {report.organ && <Badge className="text-xs bg-blue-100 text-blue-800">{report.organ}</Badge>}
              {!isNested && report.is_recurring_series && (
                <Badge className="text-xs bg-purple-100 text-purple-800">Series</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {report.document_type && (
                <Badge variant="secondary" className="text-xs">
                  {report.document_type}
                  {report.document_subtype && ` → ${report.document_subtype}`}
                </Badge>
              )}
              {report.author_level1 && (
                <Badge variant="outline" className="text-xs">
                  {report.author_level1}
                  {report.author_level2 && ` → ${report.author_level2}`}
                </Badge>
              )}
              {!isNested && report.cluster_id !== null && (
                <Badge variant="outline" className="text-xs">
                  {clusterMetadata?.cluster_titles?.[report.cluster_id.toString()] || `Cluster ${report.cluster_id}`}
                </Badge>
              )}
              {report.word_count && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {report.word_count.toLocaleString()} words
                </span>
              )}
            </div>
          </div>
          <a
            href={report.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm whitespace-nowrap font-medium flex items-center gap-1"
          >
            View PDF →
          </a>
        </div>

        {!isNested && (
          <div className="mt-3 space-y-2">
            {seriesReports.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSeriesExpansion(report.symbol || '')}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  {isSeriesExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  {seriesReports.length} previous version{seriesReports.length !== 1 ? 's' : ''}
                </button>
                {isSeriesExpanded && (
                  <div className="mt-2 ml-4 space-y-2">
                    {seriesReports.map(sr => (
                      <ReportCard key={sr.symbol} report={sr} isNested={true} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {similarReports.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSimilarExpansion(report.symbol || '')}
                  className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800 font-medium"
                >
                  {isSimilarExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  Most similar reports
                </button>
                {isSimilarExpanded && (
                  <div className="mt-2 ml-4 space-y-2">
                    {similarReports.map((sr: any, idx: number) => (
                      <div key={sr.symbol} className="border-l-2 border-green-300 pl-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            {(sr.similarity * 100).toFixed(0)}% similar
                          </Badge>
                          <span className="text-xs text-gray-500">#{idx + 1}</span>
                        </div>
                        <ReportCard report={sr} isNested={true} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const ClusterCard = ({ clusterId, reports }: { clusterId: number; reports: Report[] }) => {
    const isExpanded = expandedClusters.has(clusterId)
    const meanSimilarity = reports[0]?.cluster_mean_similarity || 0
    const metadata = clusterMetadata?.cluster_details?.[clusterId.toString()]

    return (
      <Card className="mb-4">
        <CardHeader>
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <button
                onClick={() => toggleClusterExpansion(clusterId)}
                className="flex items-center gap-2 text-left flex-1"
              >
                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                <div className="flex-1">
                  <CardTitle className="text-xl">
                    {metadata?.title || `Cluster ${clusterId}`}
                  </CardTitle>
                  {metadata?.description && (
                    <p className="text-sm text-gray-600 mt-1">{metadata.description}</p>
                  )}
                </div>
              </button>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                {metadata?.theme && (
                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                    {metadata.theme}
                  </Badge>
                )}
                <Badge className="bg-blue-100 text-blue-800">{reports.length} reports</Badge>
                <Badge variant="outline">
                  {(meanSimilarity * 100).toFixed(0)}% similar
                </Badge>
              </div>
            </div>
            
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent>
            <div className="space-y-2">
              {reports.map(report => (
                <ReportCard key={report.symbol} report={report} />
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="text-lg text-gray-600">Loading reports data...</div>
        <div className="text-sm text-gray-500">This may take a moment</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="text-xl font-semibold text-gray-900">Error Loading Data</div>
        <div className="text-gray-600">{error}</div>
        <Button onClick={() => window.location.reload()}>Reload Page</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with intro text */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-lg border border-blue-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">UN Reports Analysis</h1>
        <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
          Analysis of UN reports published by the UN Digital Library from 2020–2025.
        </p>
        <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
          Clusters are based on semantic similarity, with automatically generated cluster titles.
        </p>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-gray-600">Total Reports</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#009edb]">{stats.totalLatest}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-gray-600">Identified Clusters</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#009edb]">{stats.numClusters}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-gray-600">Recurring Series</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#009edb]">{stats.totalSeries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-gray-600">Avg Cluster Similarity</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#009edb]">
              {(stats.avgSimilarity * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Explore Reports</h2>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={exportClusterAnalysis}
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Analysis
            </Button>
            
            {/* View Toggle */}
            <div className="flex border rounded-md overflow-hidden">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none h-full"
              >
                <LayoutList className="mr-2 h-4 w-4" />
                List
              </Button>
              <Button
                variant={viewMode === 'cluster' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cluster')}
                className="rounded-none h-full"
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Clusters
              </Button>
            </div>

            {/* Sort (always visible) */}
            <Select value={clusterSort} onValueChange={(v: 'size' | 'similarity') => setClusterSort(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="size">Sort: Cluster Size</SelectItem>
                <SelectItem value="similarity">Sort: Similarity</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Organ</label>
            <HierarchicalSelect
              options={organOptions}
              selected={selectedOrgans}
              onSelectionChange={setSelectedOrgans}
              placeholder="All Organs"
              searchPlaceholder="Search organs..."
              showPrefix={true}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Document Type</label>
            <HierarchicalSelect
              options={documentTypeOptions}
              selected={selectedDocumentTypes}
              onSelectionChange={setSelectedDocumentTypes}
              placeholder="All Types"
              searchPlaceholder="Search types..."
              showPrefix={false}
              sortByCount={true}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Author</label>
            <HierarchicalSelect
              options={authorOptions}
              selected={selectedAuthors}
              onSelectionChange={setSelectedAuthors}
              placeholder="All Authors"
              searchPlaceholder="Search authors..."
              showPrefix={false}
              sortByCount={true}
            />
          </div>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-gray-600">Active Filters:</span>
            {searchTerm && (
              <Badge variant="secondary" className="gap-2">
                Search: "{searchTerm}"
                <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-red-600">×</button>
              </Badge>
            )}
            {selectedOrgans.size > 0 && (
              <>
                {Array.from(selectedOrgans).slice(0, 3).map(key => {
                  const [level1, level2] = key.split('|')
                  const displayName = level2.split(' - ')[0] // Get abbreviation part
                  return (
                    <Badge key={key} variant="secondary" className="gap-2">
                      {displayName}
                      <button onClick={() => {
                        const newSelected = new Set(selectedOrgans)
                        newSelected.delete(key)
                        setSelectedOrgans(newSelected)
                      }} className="ml-1 hover:text-red-600">×</button>
                    </Badge>
                  )
                })}
                {selectedOrgans.size > 3 && (
                  <Badge variant="secondary">+{selectedOrgans.size - 3} more</Badge>
                )}
              </>
            )}
            {selectedDocumentTypes.size > 0 && (
              <>
                {Array.from(selectedDocumentTypes).slice(0, 3).map(key => {
                  const [level1, level2] = key.split('|')
                  const displayName = level2 === level1 ? level1 : level2
                  return (
                    <Badge key={key} variant="secondary" className="gap-2">
                      {displayName}
                      <button onClick={() => {
                        const newSelected = new Set(selectedDocumentTypes)
                        newSelected.delete(key)
                        setSelectedDocumentTypes(newSelected)
                      }} className="ml-1 hover:text-red-600">×</button>
                    </Badge>
                  )
                })}
                {selectedDocumentTypes.size > 3 && (
                  <Badge variant="secondary">+{selectedDocumentTypes.size - 3} more</Badge>
                )}
              </>
            )}
            {selectedAuthors.size > 0 && (
              <>
                {Array.from(selectedAuthors).slice(0, 3).map(key => {
                  const [level1, level2] = key.split('|')
                  const displayName = level2 === level1 ? level1 : level2
                  return (
                    <Badge key={key} variant="secondary" className="gap-2">
                      {displayName.length > 30 ? displayName.substring(0, 30) + '...' : displayName}
                      <button onClick={() => {
                        const newSelected = new Set(selectedAuthors)
                        newSelected.delete(key)
                        setSelectedAuthors(newSelected)
                      }} className="ml-1 hover:text-red-600">×</button>
                    </Badge>
                  )
                })}
                {selectedAuthors.size > 3 && (
                  <Badge variant="secondary">+{selectedAuthors.size - 3} more</Badge>
                )}
              </>
            )}
            {(yearRange[0] !== 2020 || yearRange[1] !== 2025) && (
              <Badge variant="secondary" className="gap-2">
                Years: {yearRange[0]}-{yearRange[1]}
                <button onClick={() => setYearRange([2020, 2025])} className="ml-1 hover:text-red-600">×</button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              Clear All
            </Button>
          </div>
        )}

        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            Showing {filteredReports.length} reports
            {viewMode === 'cluster' && ` (${clusteredReports.clusters.size} clusters)`}
          </span>
        </div>
      </div>

      {/* Results */}
      <div>
        {viewMode === 'list' ? (
          <div className="space-y-2">
            {(paginatedData.items as Report[]).map(report => (
              <ReportCard key={report.symbol} report={report} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Clustered reports */}
            {(paginatedData.items as [number, Report[]][]).map(([clusterId, reports]) => (
              <ClusterCard key={clusterId} clusterId={clusterId} reports={reports} />
            ))}
          </div>
        )}

        {filteredReports.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No reports found matching your filters.
          </div>
        )}

        {/* Pagination Controls */}
        <PaginationControls />
      </div>

      {/* UN Proposals for Reports and Meetings */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200 p-6 mt-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          UN Proposals for Reports and Meetings
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          From the UN80 report "Shifting Paradigms" (paragraph 38), presented to maximize the value of meetings and reports:
        </p>
        
        <div className="space-y-3">
          <div className="p-4 bg-white rounded-lg border border-gray-300">
            <p className="text-sm">
              <span className="font-semibold text-gray-900">1.</span> Prioritize and streamline requests in mandates for reports or meetings
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-300">
            <p className="text-sm">
              <span className="font-semibold text-gray-900">2.</span> Provide shorter reports and reduce maximum word counts
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-300">
            <p className="text-sm">
              <span className="font-semibold text-gray-900">3.</span> Combine reports covering similar issues and contexts wherever feasible (for example by merging separate regional reports on the same issue or submitting one report to different mandating bodies requesting reports on similar issues)
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-300">
            <p className="text-sm">
              <span className="font-semibold text-gray-900">4.</span> Introduce different report formats based on needs and content type; first reports could be longer, followed by shorter updates, visual dashboards, in-person briefings or other formats
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-300">
            <p className="text-sm">
              <span className="font-semibold text-gray-900">5.</span> Publish download statistics for all reports to inform further discussions on reporting practices
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-800">
            <strong>About this analysis:</strong> Use the "Export Analysis" button above to download detailed cluster information. 
            The clustering analysis uses machine learning to identify similar reports based on content.
          </p>
        </div>
      </div>
    </div>
  )
}

