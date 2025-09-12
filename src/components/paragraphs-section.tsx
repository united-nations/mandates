'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { FileCheck, FileText, HelpCircle, Menu, Package, Users, MessageCircle, X } from 'lucide-react'
import { ScrollToTop } from '@/components/ui/scroll-to-top'
import { Button } from '@/components/ui/button'

import { Skeleton } from '@/components/ui/skeleton'

import { explainerTexts } from '@/lib/explainer-texts'
import { useIsMobile } from '@/hooks/use-mobile'
import type { Paragraph } from '@/types'
import { titleCase } from 'title-case'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface ParagraphsSectionProps {
  paragraphs: Paragraph[]
  documentSymbol: string
  isLoading: boolean
  error: string | null
}

// TOC data structure
interface TOCItem {
  id: string
  text: string
  level: number
  children: TOCItem[]
  index: number
}

// Reusable filter dropdown component
interface FilterDropdownProps {
  label: string
  icon: React.ReactNode
  currentFilter: string
  isOpen: boolean
  onToggle: () => void
  onFilterChange: (filter: string) => void
  typeCounts: Record<string, number>
  withItemsCount: number
  withItemsLabel: string
  totalCount: number
  className?: string
  hierarchicalData?: Record<string, Record<string, number>>
  filteredTotalCount: number // Count of all paragraphs matching other filters
}

function FilterDropdown({ 
  label, 
  icon, 
  currentFilter, 
  isOpen, 
  onToggle, 
  onFilterChange, 
  typeCounts, 
  withItemsCount, 
  withItemsLabel,
  totalCount,
  className = '',
  hierarchicalData,
  filteredTotalCount
}: FilterDropdownProps) {
  const withItemsKey = `with-${label.toLowerCase()}`
  
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={onToggle}
        className={`text-xs h-7 px-3 border rounded-md bg-gray-100 hover:bg-gray-200 border-gray-300 hover:border-gray-400 transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
          currentFilter !== 'all' ? '!border-un-blue !text-un-blue !bg-un-blue/15 hover:!bg-un-blue/25' : 'text-gray-700'
        }`}
      >
        {icon}
        <span>
          {currentFilter === 'all' 
            ? label
            : currentFilter === withItemsKey
            ? `${withItemsLabel} (${withItemsCount})`
            : currentFilter.includes(':')
            ? (() => {
                const [type, item] = currentFilter.split(':')
                const itemCount = hierarchicalData?.[type]?.[item] || 0
                return `${titleCase(item)} (${itemCount})`
              })()
            : `${titleCase(currentFilter.replace(/_/g, ' '))} (${typeCounts[currentFilter] || 0})`
          }
        </span>
        <svg className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute top-8 left-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-48 py-1">
          {/* All paragraphs option */}
          <button
            onClick={() => onFilterChange('all')}
            className={`w-full text-left py-1.5 text-xs hover:bg-gray-50 flex items-center justify-between ${
              currentFilter === 'all' ? 'bg-un-blue/10 text-un-blue' : 'text-gray-700'
            }`}
          >
            <span className="pl-3">All paragraphs</span>
            <span className="text-gray-500 pr-3">{filteredTotalCount}</span>
          </button>
          
          {/* With items option */}
          {withItemsCount > 0 && withItemsLabel && (
            <button
              onClick={() => onFilterChange(withItemsKey)}
              className={`w-full text-left py-1.5 text-xs hover:bg-gray-50 flex items-center justify-between ${
                currentFilter === withItemsKey ? 'bg-un-blue/10 text-un-blue' : 'text-gray-700'
              }`}
            >
              <span className="pl-3">{withItemsLabel}</span>
              <span className="text-gray-500 pr-3">{withItemsCount}</span>
            </button>
          )}
          
          {/* Type subcategories */}
          {Object.keys(typeCounts).length > 0 && (
            Object.entries(typeCounts)
              .sort(([, a], [, b]) => {
                // Sort by count descending, but keep non-zero counts first
                if (a === 0 && b === 0) return 0
                if (a === 0) return 1
                if (b === 0) return -1
                return b - a
              })
              .map(([type, count]) => (
                <div key={type}>
                  {/* Type header */}
                  <button
                    onClick={() => count > 0 ? onFilterChange(type) : undefined}
                    disabled={count === 0}
                    className={`w-full text-left py-1.5 text-xs flex items-center justify-between ${
                      count === 0 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : currentFilter === type 
                        ? 'bg-un-blue/10 text-un-blue hover:bg-gray-50' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="pl-6">{titleCase(type.replace(/_/g, ' '))}</span>
                    <span className={`pr-3 ${count === 0 ? 'text-gray-400' : 'text-gray-500'}`}>{count}</span>
                  </button>
                  
                  {/* Individual items under this type */}
                  {hierarchicalData && hierarchicalData[type] && (
                    Object.entries(hierarchicalData[type])
                      .sort(([, a], [, b]) => {
                        // Sort by count descending, but keep non-zero counts first
                        if (a === 0 && b === 0) return 0
                        if (a === 0) return 1
                        if (b === 0) return -1
                        return b - a
                      })
                      .map(([itemName, itemCount]) => (
                        <button
                          key={`${type}-${itemName}`}
                          onClick={() => itemCount > 0 ? onFilterChange(`${type}:${itemName}`) : undefined}
                          disabled={itemCount === 0}
                          className={`w-full text-left py-1.5 text-xs flex items-center justify-between ${
                            itemCount === 0
                              ? 'text-gray-400 cursor-not-allowed'
                              : currentFilter === `${type}:${itemName}` 
                              ? 'bg-un-blue/10 text-un-blue hover:bg-gray-50' 
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span className="pl-10 text-xs">{titleCase(itemName)}</span>
                          <span className={`pr-3 text-xs ${itemCount === 0 ? 'text-gray-400' : 'text-gray-400'}`}>{itemCount}</span>
                        </button>
                      ))
                  )}
                </div>
              ))
          )}
        </div>
      )}
    </div>
  )
}

// Searchable filter dropdown component for action verbs
interface SearchableFilterDropdownProps {
  label: string
  icon: React.ReactNode
  currentFilter: string
  isOpen: boolean
  onToggle: () => void
  onFilterChange: (filter: string) => void
  typeCounts: Record<string, number>
  totalCount: number
  className?: string
  filteredTotalCount: number // Count of all paragraphs matching other filters
}

function SearchableFilterDropdown({ 
  label, 
  icon, 
  currentFilter, 
  isOpen, 
  onToggle, 
  onFilterChange, 
  typeCounts, 
  totalCount,
  className = '',
  filteredTotalCount
}: SearchableFilterDropdownProps) {
  const [searchTerm, setSearchTerm] = useState('')
  
  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    const entries = Object.entries(typeCounts)
    if (!searchTerm) return entries
    
    return entries.filter(([verb]) => 
      verb.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [typeCounts, searchTerm])
  
  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
    }
  }, [isOpen])
  
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={onToggle}
        className={`text-xs h-7 px-3 border rounded-md bg-gray-100 hover:bg-gray-200 border-gray-300 hover:border-gray-400 transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
          currentFilter !== 'all' ? '!border-un-blue !text-un-blue !bg-un-blue/15 hover:!bg-un-blue/25' : 'text-gray-700'
        }`}
      >
        {icon}
        <span>
          {currentFilter === 'all' 
            ? label
            : `${titleCase(currentFilter.replace(/_/g, ' '))} (${typeCounts[currentFilter] || 0})`
          }
        </span>
        <svg className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute top-8 left-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-48 py-1">
          {/* Search input */}
          <div className="px-3 py-2 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search action verbs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-un-blue focus:border-un-blue"
              autoFocus
            />
          </div>
          
          {/* Scrollable options container */}
          <div className="max-h-48 overflow-y-auto dropdown-scroll-container">
            {/* All paragraphs option */}
            <button
              onClick={() => onFilterChange('all')}
              className={`w-full text-left py-1.5 text-xs hover:bg-gray-50 flex items-center justify-between ${
                currentFilter === 'all' ? 'bg-un-blue/10 text-un-blue' : 'text-gray-700'
              }`}
            >
              <span className="pl-3">All paragraphs</span>
              <span className="text-gray-500 pr-3">{filteredTotalCount}</span>
            </button>
            
            {/* Filtered action verbs */}
            {filteredOptions.length > 0 ? (
              filteredOptions
                .sort(([, a], [, b]) => {
                  // Sort by count descending, but keep non-zero counts first
                  if (a === 0 && b === 0) return 0
                  if (a === 0) return 1
                  if (b === 0) return -1
                  return b - a
                })
                .map(([verb, count]) => (
                  <button
                    key={verb}
                    onClick={() => count > 0 ? onFilterChange(verb) : undefined}
                    disabled={count === 0}
                    className={`w-full text-left py-1.5 text-xs flex items-center justify-between ${
                      count === 0
                        ? 'text-gray-400 cursor-not-allowed'
                        : currentFilter === verb 
                        ? 'bg-un-blue/10 text-un-blue hover:bg-gray-50' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="pl-6">{titleCase(verb.replace(/_/g, ' '))}</span>
                    <span className={`pr-3 ${count === 0 ? 'text-gray-400' : 'text-gray-500'}`}>{count}</span>
                  </button>
                ))
            ) : searchTerm ? (
              <div className="px-3 py-2 text-xs text-gray-500 italic">
                No action verbs found matching "{searchTerm}"
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to check if paragraph is operative
function isOperativeParagraph(paragraph: Paragraph): boolean {
  return paragraph.paragraph_type === 'operative'
}

// Helper function to get operative badge info (for corner display)
function getOperativeBadgeInfo(paragraph: Paragraph) {
  const isOperative = paragraph.paragraph_type === 'operative'
  
  return {
    color: 'bg-un-blue text-white hover:bg-blue-700',
    letter: 'OP',
    ariaLabel: 'Operative paragraph',
    shouldShow: isOperative
  }
}

export function ParagraphsSection({ paragraphs: allParagraphs, documentSymbol, isLoading, error }: ParagraphsSectionProps) {
  const [paragraphFilter, setParagraphFilter] = useState<'all' | 'operative'>('operative')
  const [deliverableFilter, setDeliverableFilter] = useState<string>('all')
  const [isDeliverableDropdownOpen, setIsDeliverableDropdownOpen] = useState(false)
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false)
  const [actionVerbFilter, setActionVerbFilter] = useState<string>('all')
  const [isActionVerbDropdownOpen, setIsActionVerbDropdownOpen] = useState(false)
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null)
  const [openTooltip, setOpenTooltip] = useState<string | null>(null)
  const [isMobileTOCOpen, setIsMobileTOCOpen] = useState(false)
  const [showFloatingTOC, setShowFloatingTOC] = useState(false)

  
  const isMobile = useIsMobile()
  const paragraphsTitleRef = useRef<HTMLDivElement>(null)

  // Check if any filters are active (excluding paragraph type which defaults to 'operative')
  const hasActiveFilters = useMemo(() => {
    return deliverableFilter !== 'all' || 
           assigneeFilter !== 'all' || 
           actionVerbFilter !== 'all'
  }, [deliverableFilter, assigneeFilter, actionVerbFilter])

  // Reset all filters to default
  const resetFilters = useCallback(() => {
    setDeliverableFilter('all')
    setAssigneeFilter('all')
    setActionVerbFilter('all')
    // Keep paragraph filter as 'operative' since that's the default
  }, [])

  // Helper function to check if a paragraph matches filters (excluding the filter being calculated)
  const paragraphMatchesOtherFilters = useCallback((paragraph: Paragraph, excludeFilter: 'deliverable' | 'assignee' | 'actionVerb'): boolean => {
    // Filter by paragraph type (always applied)
    if (paragraphFilter === 'operative' && paragraph.paragraph_type !== 'operative') {
      return false
    }
    
    // Filter by assignee type or individual assignee (if not excluded)
    if (excludeFilter !== 'assignee') {
      if (assigneeFilter === 'with-assignees') {
        if (!paragraph.mandates?.some(mandate => mandate.assignees?.length > 0)) {
          return false
        }
      } else if (assigneeFilter !== 'all') {
        if (assigneeFilter.includes(':')) {
          const [filterType, filterAssignee] = assigneeFilter.split(':')
          if (!paragraph.mandates?.some(mandate => 
            mandate.assignees?.some(assignee => 
              assignee.assignee_type === filterType && 
              (assignee.assignee_normalized || assignee.assignee) === filterAssignee
            )
          )) {
            return false
          }
        } else {
          if (!paragraph.mandates?.some(mandate => 
            mandate.assignees?.some(assignee => 
              assignee.assignee_type === assigneeFilter
            )
          )) {
            return false
          }
        }
      }
    }
    
    // Filter by deliverable type (if not excluded)
    if (excludeFilter !== 'deliverable') {
      if (deliverableFilter === 'with-deliverables') {
        if (!paragraph.mandates?.some(mandate => mandate.deliverables?.length > 0)) {
          return false
        }
      } else if (deliverableFilter !== 'all') {
        if (!paragraph.mandates?.some(mandate => 
          mandate.deliverables?.some(deliverable => 
            deliverable.deliverable_type === deliverableFilter
          )
        )) {
          return false
        }
      }
    }
    
    // Filter by action verb (if not excluded)
    if (excludeFilter !== 'actionVerb') {
      if (actionVerbFilter !== 'all') {
        if (!paragraph.mandates?.some(mandate => 
          mandate.action_verb && mandate.action_verb.toLowerCase() === actionVerbFilter
        )) {
          return false
        }
      }
    }
    
    return true
  }, [paragraphFilter, assigneeFilter, deliverableFilter, actionVerbFilter])

  // Get all possible deliverable types from unfiltered data
  const allDeliverableTypes = useMemo(() => {
    if (!allParagraphs) return new Set<string>()
    
    const types = new Set<string>()
    allParagraphs.forEach((paragraph: Paragraph) => {
      if (paragraph.mandates) {
        paragraph.mandates.forEach(mandate => {
          mandate.deliverables?.forEach(deliverable => {
            types.add(deliverable.deliverable_type)
          })
        })
      }
    })
    
    return types
  }, [allParagraphs])

  // Calculate deliverable type counts based on current filters (paragraph-level counting)
  const deliverableTypeCounts = useMemo(() => {
    if (!allParagraphs) return {}
    
    // Initialize all possible types with 0 count
    const counts: Record<string, number> = {}
    allDeliverableTypes.forEach(type => {
      counts[type] = 0
    })
    
    allParagraphs.forEach((paragraph: Paragraph) => {
      if (paragraphMatchesOtherFilters(paragraph, 'deliverable')) {
      if (paragraph.mandates) {
          // Track which deliverable types this paragraph has (to avoid double-counting)
          const deliverableTypesInParagraph = new Set<string>()
          
        paragraph.mandates.forEach(mandate => {
          mandate.deliverables?.forEach(deliverable => {
              deliverableTypesInParagraph.add(deliverable.deliverable_type)
            })
          })
          
          // Count this paragraph once for each unique deliverable type it contains
          deliverableTypesInParagraph.forEach(type => {
            counts[type] = (counts[type] || 0) + 1
          })
        }
      }
    })
    
    return counts
  }, [allParagraphs, paragraphMatchesOtherFilters, allDeliverableTypes])

  // Get all possible assignee types from unfiltered data
  const allAssigneeTypes = useMemo(() => {
    if (!allParagraphs) return new Set<string>()
    
    const types = new Set<string>()
    allParagraphs.forEach((paragraph: Paragraph) => {
      if (paragraph.mandates) {
        paragraph.mandates.forEach(mandate => {
          mandate.assignees?.forEach(assignee => {
            types.add(assignee.assignee_type)
          })
        })
      }
    })
    
    return types
  }, [allParagraphs])

  // Calculate assignee type counts based on current filters (paragraph-level counting)
  const assigneeTypeCounts = useMemo(() => {
    if (!allParagraphs) return {}
    
    // Initialize all possible types with 0 count
    const counts: Record<string, number> = {}
    allAssigneeTypes.forEach(type => {
      counts[type] = 0
    })
    
    allParagraphs.forEach((paragraph: Paragraph) => {
      if (paragraphMatchesOtherFilters(paragraph, 'assignee')) {
      if (paragraph.mandates) {
          // Track which assignee types this paragraph has (to avoid double-counting)
          const assigneeTypesInParagraph = new Set<string>()
          
        paragraph.mandates.forEach(mandate => {
          mandate.assignees?.forEach(assignee => {
              assigneeTypesInParagraph.add(assignee.assignee_type)
            })
          })
          
          // Count this paragraph once for each unique assignee type it contains
          assigneeTypesInParagraph.forEach(type => {
            counts[type] = (counts[type] || 0) + 1
          })
        }
      }
    })
    
    return counts
  }, [allParagraphs, paragraphMatchesOtherFilters, allAssigneeTypes])

  // Get all possible individual assignees grouped by type from unfiltered data
  const allAssigneesByType = useMemo(() => {
    if (!allParagraphs) return {}
    
    const groupedAssignees: Record<string, Record<string, number>> = {}
    
    allParagraphs.forEach((paragraph: Paragraph) => {
      if (paragraph.mandates) {
        paragraph.mandates.forEach(mandate => {
          mandate.assignees?.forEach(assignee => {
            const type = assignee.assignee_type
            const assigneeName = assignee.assignee_normalized || assignee.assignee
            
            if (!groupedAssignees[type]) {
              groupedAssignees[type] = {}
            }
            
            if (!groupedAssignees[type][assigneeName]) {
              groupedAssignees[type][assigneeName] = 0
            }
          })
        })
      }
    })
    
    return groupedAssignees
  }, [allParagraphs])

  // Calculate individual assignee counts grouped by type based on current filters (paragraph-level counting)
  const assigneesByType = useMemo(() => {
    if (!allParagraphs) return {}
    
    // Initialize with all possible assignees with 0 count
    const groupedAssignees: Record<string, Record<string, number>> = {}
    Object.entries(allAssigneesByType).forEach(([type, assignees]) => {
      groupedAssignees[type] = {}
      Object.keys(assignees).forEach(assigneeName => {
        groupedAssignees[type][assigneeName] = 0
      })
    })
    
    allParagraphs.forEach((paragraph: Paragraph) => {
      if (paragraphMatchesOtherFilters(paragraph, 'assignee')) {
        if (paragraph.mandates) {
          // Track which assignees this paragraph has (to avoid double-counting)
          const assigneesInParagraph = new Set<string>()
          
          paragraph.mandates.forEach(mandate => {
            mandate.assignees?.forEach(assignee => {
              const type = assignee.assignee_type
              const assigneeName = assignee.assignee_normalized || assignee.assignee
              assigneesInParagraph.add(`${type}:${assigneeName}`)
            })
          })
          
          // Count this paragraph once for each unique assignee it contains
          assigneesInParagraph.forEach(assigneeKey => {
            const [type, assigneeName] = assigneeKey.split(':')
            
            if (groupedAssignees[type] && groupedAssignees[type][assigneeName] !== undefined) {
              groupedAssignees[type][assigneeName] = (groupedAssignees[type][assigneeName] || 0) + 1
            }
          })
        }
      }
    })
    
    return groupedAssignees
  }, [allParagraphs, paragraphMatchesOtherFilters, allAssigneesByType])

  // Calculate count of paragraphs with any assignees based on current filters
  const paragraphsWithAssigneesCount = useMemo(() => {
    if (!allParagraphs) return 0
    
    return allParagraphs.filter((paragraph: Paragraph) => 
      paragraphMatchesOtherFilters(paragraph, 'assignee') &&
      paragraph.mandates?.some(mandate => mandate.assignees?.length > 0)
    ).length
  }, [allParagraphs, paragraphMatchesOtherFilters])

  // Get all possible action verbs from unfiltered data
  const allActionVerbs = useMemo(() => {
    if (!allParagraphs) return new Set<string>()
    
    const verbs = new Set<string>()
    allParagraphs.forEach((paragraph: Paragraph) => {
      if (paragraph.mandates) {
        paragraph.mandates.forEach(mandate => {
          if (mandate.action_verb) {
            verbs.add(mandate.action_verb.toLowerCase())
          }
        })
      }
    })
    
    return verbs
  }, [allParagraphs])

  // Calculate action verb counts based on current filters (paragraph-level counting)
  const actionVerbCounts = useMemo(() => {
    if (!allParagraphs) return {}
    
    // Initialize all possible verbs with 0 count
    const counts: Record<string, number> = {}
    allActionVerbs.forEach(verb => {
      counts[verb] = 0
    })
    
    allParagraphs.forEach((paragraph: Paragraph) => {
      if (paragraphMatchesOtherFilters(paragraph, 'actionVerb')) {
      if (paragraph.mandates) {
          // Track which action verbs this paragraph has (to avoid double-counting)
          const actionVerbsInParagraph = new Set<string>()
          
        paragraph.mandates.forEach(mandate => {
          if (mandate.action_verb) {
              actionVerbsInParagraph.add(mandate.action_verb.toLowerCase())
            }
          })
          
          // Count this paragraph once for each unique action verb it contains
          actionVerbsInParagraph.forEach(verb => {
            counts[verb] = (counts[verb] || 0) + 1
          })
        }
      }
    })
    
    return counts
  }, [allParagraphs, paragraphMatchesOtherFilters, allActionVerbs])

  // Calculate count of paragraphs with any deliverables based on current filters
  const paragraphsWithDeliverablesCount = useMemo(() => {
    if (!allParagraphs) return 0
    
    return allParagraphs.filter((paragraph: Paragraph) => 
      paragraphMatchesOtherFilters(paragraph, 'deliverable') &&
      paragraph.mandates?.some(mandate => mandate.deliverables?.length > 0)
    ).length
  }, [allParagraphs, paragraphMatchesOtherFilters])

  // Calculate filtered total counts for "All paragraphs" option in each dropdown
  const deliverableFilteredTotalCount = useMemo(() => {
    if (!allParagraphs) return 0
    return allParagraphs.filter((paragraph: Paragraph) => 
      paragraphMatchesOtherFilters(paragraph, 'deliverable')
    ).length
  }, [allParagraphs, paragraphMatchesOtherFilters])

  const assigneeFilteredTotalCount = useMemo(() => {
    if (!allParagraphs) return 0
    return allParagraphs.filter((paragraph: Paragraph) => 
      paragraphMatchesOtherFilters(paragraph, 'assignee')
    ).length
  }, [allParagraphs, paragraphMatchesOtherFilters])

  const actionVerbFilteredTotalCount = useMemo(() => {
    if (!allParagraphs) return 0
    return allParagraphs.filter((paragraph: Paragraph) => 
      paragraphMatchesOtherFilters(paragraph, 'actionVerb')
    ).length
  }, [allParagraphs, paragraphMatchesOtherFilters])

  // Frontend filtering of paragraphs
  const paragraphs = useMemo(() => {
    if (!allParagraphs) return allParagraphs
    
    // Helper function to check if a paragraph matches the current filters
    const paragraphMatchesFilters = (paragraph: Paragraph): boolean => {
      // Filter by paragraph type
      if (paragraphFilter === 'operative' && paragraph.paragraph_type !== 'operative') {
        return false
      }
      
      // Filter by deliverable type
      if (deliverableFilter === 'with-deliverables') {
        if (!paragraph.mandates?.some(mandate => mandate.deliverables?.length > 0)) {
          return false
        }
      } else if (deliverableFilter !== 'all') {
        if (!paragraph.mandates?.some(mandate => 
          mandate.deliverables?.some(deliverable => 
            deliverable.deliverable_type === deliverableFilter
          )
        )) {
          return false
        }
      }
      
      // Filter by assignee type or individual assignee
      if (assigneeFilter === 'with-assignees') {
        if (!paragraph.mandates?.some(mandate => mandate.assignees?.length > 0)) {
          return false
        }
      } else if (assigneeFilter !== 'all') {
        if (assigneeFilter.includes(':')) {
          // Individual assignee filter (format: "type:assigneeName")
          const [filterType, filterAssignee] = assigneeFilter.split(':')
          if (!paragraph.mandates?.some(mandate => 
            mandate.assignees?.some(assignee => 
              assignee.assignee_type === filterType && 
              (assignee.assignee_normalized || assignee.assignee) === filterAssignee
            )
          )) {
            return false
          }
        } else {
          // Assignee type filter
          if (!paragraph.mandates?.some(mandate => 
            mandate.assignees?.some(assignee => 
              assignee.assignee_type === assigneeFilter
            )
          )) {
            return false
          }
        }
      }
      
      // Filter by action verb
      if (actionVerbFilter !== 'all') {
        if (!paragraph.mandates?.some(mandate => 
          mandate.action_verb && mandate.action_verb.toLowerCase() === actionVerbFilter
        )) {
          return false
        }
      }
      
      return true
    }

    // Helper function to check if a heading has any visible content beneath it
    const headingHasVisibleContent = (headingIndex: number): boolean => {
      const heading = allParagraphs[headingIndex]
      if (heading.type !== 'heading') return false
      
      const currentLevel = heading.heading_level || 3
      
      // Find the next heading at the same or higher level
      let nextHeadingIndex = -1
      for (let i = headingIndex + 1; i < allParagraphs.length; i++) {
        const nextParagraph = allParagraphs[i]
        if (nextParagraph.type === 'heading' && (nextParagraph.heading_level || 3) <= currentLevel) {
          nextHeadingIndex = i
          break
        }
      }
      
      // Check if there are any matching paragraphs between this heading and the next
      const endIndex = nextHeadingIndex === -1 ? allParagraphs.length : nextHeadingIndex
      for (let i = headingIndex + 1; i < endIndex; i++) {
        const paragraph = allParagraphs[i]
        if (paragraph.type !== 'heading' && paragraphMatchesFilters(paragraph)) {
          return true
        }
      }
      
      return false
    }

    // Check if any filters are active
    const hasActiveFilters = paragraphFilter !== 'all' || 
                            deliverableFilter !== 'all' || 
                            assigneeFilter !== 'all' || 
                            actionVerbFilter !== 'all'

    // Filter paragraphs
    const filtered = allParagraphs.filter((paragraph: Paragraph, index: number) => {
      if (paragraph.type === 'heading') {
        // If no filters are active, always show headings
        if (!hasActiveFilters) {
          return true
        }
        // If filters are active, only show headings that have visible content beneath them
        return headingHasVisibleContent(index)
      }
      
      // For non-heading paragraphs, apply the filters
      return paragraphMatchesFilters(paragraph)
    })
    
    return filtered
  }, [allParagraphs, paragraphFilter, deliverableFilter, assigneeFilter, actionVerbFilter])

  // Build TOC from paragraphs
  const tocItems = useMemo((): TOCItem[] => {
    if (!paragraphs || paragraphs.length === 0) return []

    const items: TOCItem[] = []
    const stack: TOCItem[] = []

    paragraphs.forEach((paragraph: Paragraph, index: number) => {
      if (paragraph.type === 'heading') {
        const level = paragraph.heading_level || 3
        // Include prefix in TOC text if it exists
        const displayText = paragraph.prefix 
          ? `${paragraph.prefix} ${paragraph.text}`
          : paragraph.text
        const item: TOCItem = {
          id: `heading-${index}`,
          text: displayText,
          level,
          children: [],
          index
        }

        // Remove items from stack that are at same or deeper level
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop()
        }

        if (stack.length === 0) {
          // Top-level item
          items.push(item)
        } else {
          // Child item
          stack[stack.length - 1].children.push(item)
        }

        stack.push(item)
      }
    })

    return items
  }, [paragraphs])

  // Helper function to check if a section should be expanded based on active heading
  const isInActivePath = useCallback((item: TOCItem): boolean => {
    if (!activeHeadingId) return false
    
    // Check if this item or any of its descendants is active
    const checkDescendants = (currentItem: TOCItem): boolean => {
      if (currentItem.id === activeHeadingId) return true
      return currentItem.children.some(child => checkDescendants(child))
    }
    
    return checkDescendants(item)
  }, [activeHeadingId])

  // Intersection Observer for scroll detection
  useEffect(() => {
    if (!paragraphs || paragraphs.length === 0 || tocItems.length === 0) return

    // Add a small delay to ensure DOM elements are rendered
    const timeoutId = setTimeout(() => {
      const headingElements = paragraphs
        .map((paragraph: Paragraph, index: number) => {
          if (paragraph.type === 'heading') {
            return document.getElementById(`heading-${index}`)
          }
          return null
        })
        .filter(Boolean) as HTMLElement[]

      if (headingElements.length === 0) {
        // Try again after a longer delay if no elements found
        const retryTimeoutId = setTimeout(() => {
          const retryElements = paragraphs
            .map((paragraph: Paragraph, index: number) => {
              if (paragraph.type === 'heading') {
                return document.getElementById(`heading-${index}`)
              }
              return null
            })
            .filter(Boolean) as HTMLElement[]

          if (retryElements.length === 0) return

          const observer = new IntersectionObserver(
            (entries) => {
              if (entries.length === 0) return

              // Sort entries by their position in the document
              const sortedEntries = entries.sort((a, b) => {
                const aRect = a.boundingClientRect
                const bRect = b.boundingClientRect
                return aRect.top - bRect.top
              })

              // Find the best heading to highlight
              let activeEntry = null

              // First, try to find an intersecting heading
              const intersectingEntries = sortedEntries.filter(entry => entry.isIntersecting)
              if (intersectingEntries.length > 0) {
                // Use the first intersecting heading (topmost)
                activeEntry = intersectingEntries[0]
              } else {
                // No headings are intersecting, find the last heading above the viewport
                const aboveViewport = sortedEntries.filter(entry => 
                  entry.boundingClientRect.bottom < 0
                )
                if (aboveViewport.length > 0) {
                  activeEntry = aboveViewport[aboveViewport.length - 1] // Last one above viewport
                } else {
                  // All headings are below viewport, use the first one
                  activeEntry = sortedEntries[0]
                }
              }

              if (activeEntry) {
                setActiveHeadingId(activeEntry.target.id)
              }
            },
            {
              rootMargin: '-20% 0px -60% 0px', // Trigger when heading is in upper portion of viewport
              threshold: [0, 0.25, 0.5, 0.75, 1]
            }
          )

          retryElements.forEach(el => observer.observe(el))

          // Return cleanup function for retry observer
          return () => observer.disconnect()
        }, 100)

        return () => clearTimeout(retryTimeoutId)
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.length === 0) return

          // Sort entries by their position in the document
          const sortedEntries = entries.sort((a, b) => {
            const aRect = a.boundingClientRect
            const bRect = b.boundingClientRect
            return aRect.top - bRect.top
          })

          // Find the best heading to highlight
          let activeEntry = null

          // First, try to find an intersecting heading
          const intersectingEntries = sortedEntries.filter(entry => entry.isIntersecting)
          if (intersectingEntries.length > 0) {
            // Use the first intersecting heading (topmost)
            activeEntry = intersectingEntries[0]
          } else {
            // No headings are intersecting, find the last heading above the viewport
            const aboveViewport = sortedEntries.filter(entry => 
              entry.boundingClientRect.bottom < 0
            )
            if (aboveViewport.length > 0) {
              activeEntry = aboveViewport[aboveViewport.length - 1] // Last one above viewport
            } else {
              // All headings are below viewport, use the first one
              activeEntry = sortedEntries[0]
            }
          }

          if (activeEntry) {
            setActiveHeadingId(activeEntry.target.id)
          }
        },
        {
          rootMargin: '-20% 0px -60% 0px', // Trigger when heading is in upper portion of viewport
          threshold: [0, 0.25, 0.5, 0.75, 1]
        }
      )

      headingElements.forEach(el => observer.observe(el))

      return () => observer.disconnect()
    }, 50) // Small delay to ensure DOM is ready

    return () => clearTimeout(timeoutId)
  }, [paragraphs]) // Remove tocItems from dependencies as it's derived from paragraphs

  // Set initial active heading when paragraphs first load
  useEffect(() => {
    if (!paragraphs || paragraphs.length === 0 || activeHeadingId !== null) return

    // Find the first heading and set it as active
    const firstHeading = paragraphs.find((p: Paragraph) => p.type === 'heading')
    if (firstHeading) {
      const firstHeadingIndex = paragraphs.indexOf(firstHeading)
      setActiveHeadingId(`heading-${firstHeadingIndex}`)
    }
  }, [paragraphs, activeHeadingId])

  // Intersection Observer for paragraphs title visibility
  useEffect(() => {
    if (!isMobile || !paragraphsTitleRef.current) return

    const titleElement = paragraphsTitleRef.current

    const checkScrollPosition = () => {
      const rect = titleElement.getBoundingClientRect()
      // Show floating TOC when the title has completely scrolled above the viewport
      setShowFloatingTOC(rect.bottom < 0)
    }

    // Check initial position
    checkScrollPosition()

    // Use scroll event listener for more reliable position tracking
    const handleScroll = () => {
      checkScrollPosition()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [isMobile])

  // TOC navigation handler
  const handleTOCClick = (headingId: string) => {
    const element = document.getElementById(headingId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Close tooltip, mobile TOC, and dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.tooltip-container')) {
        setOpenTooltip(null)
      }
      if (!target.closest('.mobile-toc-container')) {
        setIsMobileTOCOpen(false)
      }
      if (!target.closest('.deliverable-dropdown')) {
        setIsDeliverableDropdownOpen(false)
      }
      if (!target.closest('.assignee-dropdown')) {
        setIsAssigneeDropdownOpen(false)
      }
      if (!target.closest('.action-verb-dropdown')) {
        setIsActionVerbDropdownOpen(false)
      }
    }

    const handleScroll = () => {
      // Only close tooltip on scroll, not dropdowns
      if (openTooltip === 'paragraphs-beta') {
        setOpenTooltip(null)
      }
    }

    const handleResize = () => {
      // Close everything on resize as layout changes
      if (openTooltip === 'paragraphs-beta') {
        setOpenTooltip(null)
      }
      if (isDeliverableDropdownOpen) {
        setIsDeliverableDropdownOpen(false)
      }
      if (isAssigneeDropdownOpen) {
        setIsAssigneeDropdownOpen(false)
      }
      if (isActionVerbDropdownOpen) {
        setIsActionVerbDropdownOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (openTooltip === 'paragraphs-beta') {
          setOpenTooltip(null)
        }
        if (isDeliverableDropdownOpen) {
          setIsDeliverableDropdownOpen(false)
        }
        if (isAssigneeDropdownOpen) {
          setIsAssigneeDropdownOpen(false)
        }
        if (isActionVerbDropdownOpen) {
          setIsActionVerbDropdownOpen(false)
        }
        if (isMobileTOCOpen) {
          setIsMobileTOCOpen(false)
        }
      }
    }

    if (openTooltip || isMobileTOCOpen || isDeliverableDropdownOpen || isAssigneeDropdownOpen || isActionVerbDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', handleScroll, false)
      window.addEventListener('resize', handleResize)
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        window.removeEventListener('scroll', handleScroll, false)
        window.removeEventListener('resize', handleResize)
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [openTooltip, isMobileTOCOpen, isDeliverableDropdownOpen, isAssigneeDropdownOpen, isActionVerbDropdownOpen])

  const toggleTooltip = (tooltipId: string) => {
    setOpenTooltip(openTooltip === tooltipId ? null : tooltipId)
  }

  // Render TOC items recursively
  const renderTOCItem = (item: TOCItem, isTopLevel: boolean = false): React.ReactNode => {
    const isActive = activeHeadingId === item.id
    const hasChildren = item.children.length > 0
    const shouldExpand = isInActivePath(item)
    
    return (
      <div key={item.id} className="space-y-1">
        <div className="flex items-center gap-1">
          {/* Always reserve space for expand button to maintain alignment */}
          <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
            {hasChildren && (
              <button
                onClick={() => handleTOCClick(item.id)}
                className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                title={`Go to ${item.text}`}
              >
                <svg className={`h-3 w-3 transition-transform ${shouldExpand ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={() => handleTOCClick(item.id)}
            className={`text-left flex-1 py-1 px-2 rounded text-xs hover:bg-gray-100 transition-colors ${
              isActive ? 'bg-un-blue/10 text-un-blue font-medium' : 'text-gray-700 hover:text-gray-900'
            } ${isTopLevel ? 'font-medium' : ''}`}
            style={{ marginLeft: `${(item.level - 1) * 12}px` }}
          >
            <span className="line-clamp-2 leading-tight">
              {item.text.length > 35 ? `${item.text.substring(0, 35)}...` : item.text}
            </span>
          </button>
        </div>
        
        {hasChildren && shouldExpand && (
          <div className="space-y-1">
            {item.children.map(child => renderTOCItem(child, false))}
          </div>
        )}
      </div>
    )
  }

  // Helper function to parse and render text with proper React tooltip components
  const renderProcessedText = (text: string, actionVerb: string | null, links: [string, string][], textWithHighlights?: string, mandates?: any[]) => {
    const sourceText = textWithHighlights || text
    
    if (!textWithHighlights) {
      // Handle links and special phrase highlighting for non-highlighted text
      let processedText = sourceText
      
      // First, highlight "within existing resources" in bold red
      const withinExistingResourcesRegex = /within existing resources/gi
      processedText = processedText.replace(withinExistingResourcesRegex, '<span class="font-bold text-red-600">within existing resources</span>')
      
      // Then handle links
      if (links && links.length > 0) {
        links.forEach(([linkText, url]) => {
          const linkRegex = new RegExp(linkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
          processedText = processedText.replace(linkRegex, `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-un-blue hover:underline font-medium">${linkText}</a>`)
        })
      }
      return <span dangerouslySetInnerHTML={{ __html: processedText }} />
    }

    // Parse text and create segments with proper React components
    const segments: React.ReactNode[] = []
    let segmentKey = 0
    
    // Split text by all special patterns to process sequentially
    const allPatterns = [
      { pattern: /\*(.*?)\*/g, type: 'verb' },
      { pattern: /<<(.*?)>>/g, type: 'assignee' },
      { pattern: /\[\[(.*?)\]\]/g, type: 'deliverable' },
      { pattern: /within existing resources/gi, type: 'highlight' }
    ]
    
    let currentText = sourceText
    const replacements: { start: number; end: number; component: React.ReactNode; text: string }[] = []
    
    // Find all matches across all patterns
    allPatterns.forEach(({ pattern, type }) => {
      let match
      while ((match = pattern.exec(sourceText)) !== null) {
        const matchText = type === 'highlight' ? match[0] : match[1]
        let component: React.ReactNode
        
        if (type === 'highlight') {
          component = (
            <span key={`highlight-${segmentKey++}`} className="font-bold text-red-600">
              {matchText}
            </span>
          )
        } else if (type === 'verb') {
          const correspondingMandate = mandates?.find(mandate => 
            mandate.action_verb && mandate.action_verb.toLowerCase() === matchText.toLowerCase()
          )
          const shouldBeBold = correspondingMandate?.action_verb_type === 'deciding' || 
                              correspondingMandate?.action_verb_type === 'directive'
          
          component = (
            <Tooltip key={`verb-${segmentKey++}`}>
              <TooltipTrigger asChild>
                <span className={`${shouldBeBold ? 'font-semibold' : ''} text-un-blue cursor-help`}>
                  {matchText}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-1">
                  <div className="font-medium">Action Verb</div>
                  <div className="text-sm">
                    {titleCase((correspondingMandate?.action_verb_type || 'Unknown').replace(/_/g, ' '))}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )
        } else if (type === 'assignee') {
          let assigneeData: any = null
          mandates?.forEach(mandate => {
            mandate.assignees?.forEach((assignee: any) => {
              if (assignee.assignee.toLowerCase() === matchText.toLowerCase()) {
                assigneeData = assignee
              }
            })
          })
          
          component = (
            <Tooltip key={`assignee-${segmentKey++}`}>
              <TooltipTrigger asChild>
                <span className="bg-gray-200 border border-un-blue px-2 py-0.5 rounded-full text-sm font-medium cursor-help">
                  <Users className="w-3 h-3 inline mr-1 align-middle" />
                  {matchText}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-1">
                  <div className="font-medium">Assignee</div>
                  <div className="text-sm">
                    <div>{titleCase((assigneeData?.assignee_type || 'Unknown').replace(/_/g, ' '))}</div>
                    {assigneeData?.assignee_normalized && (
                      <div className="text-gray-500">{assigneeData.assignee_normalized}</div>
                    )}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )
        } else if (type === 'deliverable') {
          let deliverableData: any = null
          mandates?.forEach(mandate => {
            mandate.deliverables?.forEach((deliverable: any) => {
              if (deliverable.deliverable.toLowerCase() === matchText.toLowerCase()) {
                deliverableData = deliverable
              }
            })
          })
          
          component = (
            <Tooltip key={`deliverable-${segmentKey++}`}>
              <TooltipTrigger asChild>
                <span className="bg-gray-200 border border-gray-350 px-2 py-0.5 rounded-full text-sm font-medium cursor-help">
                  <Package className="w-3 h-3 inline mr-1 align-middle" />
                  {matchText}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-1">
                  <div className="font-medium">Deliverable</div>
                  <div className="text-sm">
                    <div>{titleCase((deliverableData?.deliverable_type || 'Unknown').replace(/_/g, ' '))}</div>
                    {deliverableData?.deliverable_normalized && (
                      <div className="text-gray-500">{deliverableData.deliverable_normalized}</div>
                    )}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )
        }
        
        replacements.push({
          start: match.index,
          end: match.index + match[0].length,
          component: component!,
          text: match[0]
        })
      }
      pattern.lastIndex = 0 // Reset regex
    })
    
    // Sort replacements by position and build segments
    replacements.sort((a, b) => a.start - b.start)
    
    let lastIndex = 0
    replacements.forEach((replacement, index) => {
      // Add text before this replacement
      if (replacement.start > lastIndex) {
        const textBefore = sourceText.slice(lastIndex, replacement.start)
        if (textBefore) {
          segments.push(<span key={`text-${segmentKey++}`}>{textBefore}</span>)
        }
      }
      
      // Add the replacement component
      segments.push(replacement.component)
      lastIndex = replacement.end
    })
    
    // Add remaining text
    if (lastIndex < sourceText.length) {
      const remainingText = sourceText.slice(lastIndex)
      if (remainingText) {
        segments.push(<span key={`text-${segmentKey++}`}>{remainingText}</span>)
      }
    }

    return <>{segments}</>
  }

  return (
    <div className="space-y-4">
      <div ref={paragraphsTitleRef} className="space-y-4">
        {/* Title and Filters Row */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title Section */}
          <h3 className="text-base font-semibold flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            <span>{explainerTexts.mandateDetail.paragraphs.title}</span>
            <div className="relative tooltip-container">
              <button
                type="button"
                className="p-0 border-0 bg-transparent cursor-help focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-sm flex items-center"
                aria-label="Information about paragraph extraction"
                onClick={() => toggleTooltip('paragraphs-beta')}
              >
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </button>
              {openTooltip === 'paragraphs-beta' && (
                <div className="absolute left-0 top-6 z-50 w-80 p-3 bg-white border rounded-md shadow-lg text-sm font-normal">
                  <p>{explainerTexts.mandateDetail.paragraphs.betaDisclaimer}</p>
                </div>
              )}
            </div>
          </h3>

          {/* Filters Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-sm font-medium text-gray-600 hidden sm:block">Filter:</span>
            
            {/* Filter buttons - responsive flex */}
            <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
              {/* Assignee type dropdown */}
              {Object.keys(assigneeTypeCounts).length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <FilterDropdown
                        label="Assignees"
                        icon={<Users className="h-3 w-3" />}
                        currentFilter={assigneeFilter}
                        isOpen={isAssigneeDropdownOpen}
                        onToggle={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
                        onFilterChange={(filter) => {
                          setAssigneeFilter(filter)
                          setIsAssigneeDropdownOpen(false)
                        }}
                        typeCounts={assigneeTypeCounts}
                        withItemsCount={paragraphsWithAssigneesCount}
                        withItemsLabel="With assignees"
                        totalCount={allParagraphs?.length || 0}
                        className="assignee-dropdown"
                        hierarchicalData={assigneesByType}
                        filteredTotalCount={assigneeFilteredTotalCount}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <div className="space-y-2">
                      <div className="font-medium">Filter by Assignee</div>
                      <div className="text-sm">
                        Assignees are the entities or organizations assigned to carry out a mandate.
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* Deliverable type dropdown */}
              {Object.keys(deliverableTypeCounts).length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <FilterDropdown
                        label="Deliverables"
                        icon={<Package className="h-3 w-3" />}
                        currentFilter={deliverableFilter}
                        isOpen={isDeliverableDropdownOpen}
                        onToggle={() => setIsDeliverableDropdownOpen(!isDeliverableDropdownOpen)}
                        onFilterChange={(filter) => {
                          setDeliverableFilter(filter)
                          setIsDeliverableDropdownOpen(false)
                        }}
                        typeCounts={deliverableTypeCounts}
                        withItemsCount={paragraphsWithDeliverablesCount}
                        withItemsLabel="With deliverables"
                        totalCount={allParagraphs?.length || 0}
                        className="deliverable-dropdown"
                        filteredTotalCount={deliverableFilteredTotalCount}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <div className="space-y-2">
                      <div className="font-medium">Filter by Deliverable Type</div>
                      <div className="text-sm">
                        Deliverables are specific outputs or tasks that are mandated in a paragraph.
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* Action verb searchable dropdown */}
              {Object.keys(actionVerbCounts).length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <SearchableFilterDropdown
                        label="Actions"
                        icon={<MessageCircle className="h-3 w-3" />}
                        currentFilter={actionVerbFilter}
                        isOpen={isActionVerbDropdownOpen}
                        onToggle={() => setIsActionVerbDropdownOpen(!isActionVerbDropdownOpen)}
                        onFilterChange={(filter) => {
                          setActionVerbFilter(filter)
                          setIsActionVerbDropdownOpen(false)
                        }}
                        typeCounts={actionVerbCounts}
                        totalCount={allParagraphs?.length || 0}
                        className="action-verb-dropdown"
                        filteredTotalCount={actionVerbFilteredTotalCount}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <div className="space-y-2">
                      <div className="font-medium">Filter by Action Verb</div>
                      <div className="text-sm">
                        Action verbs determine the type and strength of operative paragraphs. 
                        {/* They may present and acknowledge information, reinforce prior statements, express a positive or negative stance, constitute an action of the assembly itself, or direct assignees to carry out deliverables. */}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* Paragraph type toggle - always visible */}
              <Tooltip>
                <TooltipTrigger asChild>
                                     <div className="flex items-center border border-gray-300 rounded-md overflow-hidden hover:border-gray-400 transition-all duration-200 bg-gray-100">
                                       <button
                     className={`text-xs h-7 px-3 transition-all duration-200 cursor-pointer ${paragraphFilter === 'operative' ? 'bg-un-blue text-white' : 'bg-transparent text-gray-700 hover:bg-gray-200 hover:text-gray-900'}`}
                     onClick={() => setParagraphFilter('operative')}
                   >
                     Operative
                   </button>
                   <div className="w-px h-4 bg-gray-300"></div>
                   <button
                     className={`text-xs h-7 px-3 transition-all duration-200 cursor-pointer ${paragraphFilter === 'all' ? 'bg-un-blue text-white' : 'bg-transparent text-gray-700 hover:bg-gray-200 hover:text-gray-900'}`}
                     onClick={() => setParagraphFilter('all')}
                   >
                     All
                   </button>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <div className="space-y-2">
                    <div className="font-medium">Filter by Paragraph Type</div>
                    <div className="text-sm">
                      <div><strong>Operative:</strong> Main paragraphs that express the opinions of Member States and contain the action that they are agreeing to take.</div>
                      <div className="mt-1"><strong>Preambular:</strong> Introductory paragraphs that present the background to the action part of the resolution.</div>
                      {/* https://www.un.org/en/ga/second/72/editingguidelines.pdf */}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
              
              {/* Reset button - only visible when filters are active */}
              {hasActiveFilters && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={resetFilters}
                      className="text-xs h-7 px-2 rounded-md bg-au-chico text-white hover:bg-shuttle-gray transition-colors flex items-center gap-1 cursor-pointer"
                      aria-label="Reset all filters"
                    >
                      <X className="h-3 w-3" />
                      <span>Reset</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reset all filters to default</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile TOC - Floating button and expandable panel */}
      {isMobile && showFloatingTOC && (
        <div className="mobile-toc-container">
          {/* Floating TOC Button */}
          <button
            onClick={() => setIsMobileTOCOpen(!isMobileTOCOpen)}
            className="fixed top-4 left-4 z-50 bg-white border border-gray-200 rounded-lg p-2 shadow-lg hover:bg-gray-50 transition-colors"
            aria-label="Toggle table of contents"
          >
            <Menu className="h-4 w-4 text-gray-700" />
          </button>
          
          {/* Expandable TOC Panel */}
          {isMobileTOCOpen && (
            <div className="fixed top-14 left-4 z-40 bg-white border border-gray-200 rounded-lg shadow-lg max-w-xs w-80 max-h-96 overflow-y-auto">
              <div className="p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Table of Contents
                </h4>
                <div className="space-y-1">
                  {tocItems.length > 0 ? (
                    tocItems.map(item => renderTOCItem(item, true))
                  ) : (
                    <div className="text-xs text-gray-500 italic">
                      No headings found in this document.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Paragraphs Content with TOC Layout */}
      <div className={isMobile ? "w-full" : "flex gap-8"}>
        {/* Main paragraph content */}
        <div className={isMobile ? "w-full" : "flex-1 max-w-[65%]"}>
          <div className={isMobile ? "" : "pr-4"}>
            {isLoading ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                  <div className="ml-6 space-y-2">
                    <div className="bg-muted/20 rounded-lg p-3">
                      <Skeleton className="h-4 w-4/5 mb-1" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <Skeleton className="h-4 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                  <div className="ml-6 space-y-2">
                    <div className="bg-muted/20 rounded-lg p-3">
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                    <div className="bg-muted/20 rounded-lg p-3">
                      <Skeleton className="h-4 w-5/6 mb-1" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <Skeleton className="h-4 w-3/5 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">Error loading paragraphs: {error}</p>
              </div>
            ) : paragraphs && paragraphs.length > 0 ? (
              <div className="space-y-4">
                {paragraphs.map((paragraph: Paragraph, index: number) => {
                  // Calculate indentation based on paragraph_level
                  const indentLevel = paragraph.paragraph_level || 0
                  const getIndentClass = (level: number): string => {
                    if (level <= 1) return ''
                    switch (level) {
                      case 2: return 'ml-6'
                      case 3: return 'ml-12'
                      case 4: return 'ml-18'
                      case 5: return 'ml-24'
                      case 6: return 'ml-30'
                      case 7: return 'ml-36'
                      case 8: return 'ml-42'
                      default: return 'ml-48' // For very deep nesting
                    }
                  }
                  const indentClass = getIndentClass(indentLevel)

                  // Generate unique ID for headings (for TOC navigation)
                  const headingId = paragraph.type === 'heading' ? `heading-${index}` : undefined


                  // Handle different content types
                  if (paragraph.type === 'heading') {
                    const HeadingTag = `h${Math.min(paragraph.heading_level || 3, 6)}` as keyof JSX.IntrinsicElements
                    const headingClasses = {
                      1: 'text-lg font-bold',
                      2: 'text-base font-bold',
                      3: 'text-base font-semibold',
                      4: 'text-sm font-semibold',
                      5: 'text-sm font-medium',
                      6: 'text-sm font-medium'
                    }
                    const headingClass = headingClasses[paragraph.heading_level as keyof typeof headingClasses] || headingClasses[3]

                    return (
                      <div key={`${documentSymbol}-${index}`}>
                        <div className={`${indentClass}`}>
                          <HeadingTag id={headingId} className={`${headingClass} text-foreground mb-3 leading-tight scroll-mt-4`}>
                            {paragraph.prefix && (
                              <span className="font-medium text-un-blue mr-2">
                                {paragraph.prefix}
                              </span>
                            )}
                            {renderProcessedText(paragraph.text, paragraph.mandates?.[0]?.action_verb || null, paragraph.links, paragraph.textWithHighlights, paragraph.mandates)}
                          </HeadingTag>
                        </div>
                      </div>
                    )
                  }

                  // Regular paragraphs
                  return (
                    <div key={`${documentSymbol}-${index}`} className={`${indentClass} relative`}>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <div className="max-w-4xl">
                          <div className="text-sm leading-relaxed">
                            {paragraph.prefix && (
                              <span className="font-medium text-un-blue mr-2">
                                {paragraph.prefix}
                              </span>
                            )}
                            {renderProcessedText(paragraph.text, paragraph.mandates?.[0]?.action_verb || null, paragraph.links, paragraph.textWithHighlights, paragraph.mandates)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Operative badge - floating at top-right corner for all devices */}
                      {(() => {
                        const badgeInfo = getOperativeBadgeInfo(paragraph)
                        return badgeInfo.shouldShow && (
                          <div className="absolute -top-1 -right-1 z-10">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`w-7 h-5 rounded-full flex items-center justify-center text-xs font-medium cursor-help ${badgeInfo.color}`}
                                  aria-label={badgeInfo.ariaLabel}
                                >
                                  {badgeInfo.letter}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Operative paragraph</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-sm leading-relaxed text-muted-foreground italic">
                  No paragraphs currently available for this document.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop TOC Sidebar - Right side, only for paragraphs section */}
        {!isMobile && (
          <div className="w-[30%] flex-shrink-0">
            <div className="sticky top-4 bg-white rounded-lg p-4 mb-8">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Table of Contents
              </h4>
              <div className="space-y-1">
                {tocItems.length > 0 ? (
                  tocItems.map(item => renderTOCItem(item, true))
                ) : (
                  <div className="text-xs text-gray-500 italic">
                    No headings found in this document.
                  </div>
                )}
              </div>
            </div>
            
            {/* Scroll to Top Button - positioned at bottom of TOC area */}
            <div className="sticky bottom-4 flex justify-center">
              <ScrollToTop />
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 