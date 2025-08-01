'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { FileCheck, FileText, HelpCircle, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { titleCase } from 'title-case'
import { explainerTexts } from '@/lib/explainer-texts'
import { useIsMobile } from '@/hooks/use-mobile'
import type { Paragraph } from '@/types'

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

export function ParagraphsSection({ paragraphs: allParagraphs, documentSymbol, isLoading, error }: ParagraphsSectionProps) {
  const [paragraphFilter, setParagraphFilter] = useState<'all' | 'operative'>('operative')
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null)
  const [openTooltip, setOpenTooltip] = useState<string | null>(null)
  const [isMobileTOCOpen, setIsMobileTOCOpen] = useState(false)
  const [showFloatingTOC, setShowFloatingTOC] = useState(false)
  
  const isMobile = useIsMobile()
  const paragraphsTitleRef = useRef<HTMLDivElement>(null)

  // Frontend filtering of paragraphs
  const paragraphs = useMemo(() => {
    if (!allParagraphs) return allParagraphs
    
    if (paragraphFilter === 'all') {
      return allParagraphs
    }
    
    return allParagraphs.filter((paragraph: Paragraph) => {
      // Always show headings
      if (paragraph.type === 'heading') {
        return true
      }
      
      // Filter based on paragraph type
      if (paragraphFilter === 'operative') {
        return paragraph.paragraph_type === 'operative'
      }
      
      return true
    })
  }, [allParagraphs, paragraphFilter])

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

  // Close tooltip and mobile TOC when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.tooltip-container')) {
        setOpenTooltip(null)
      }
      if (!target.closest('.mobile-toc-container')) {
        setIsMobileTOCOpen(false)
      }
    }

    const handleScroll = () => {
      if (openTooltip === 'paragraphs-beta') {
        setOpenTooltip(null)
      }
    }

    const handleResize = () => {
      if (openTooltip === 'paragraphs-beta') {
        setOpenTooltip(null)
      }
    }

    if (openTooltip || isMobileTOCOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', handleScroll, true)
      window.addEventListener('resize', handleResize)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        window.removeEventListener('scroll', handleScroll, true)
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [openTooltip, isMobileTOCOpen])

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

  // Helper function to process text with links and action verbs
  const processText = (text: string, actionVerb: string | null, links: [string, string][]) => {
    let processedText = text
    
    // Replace links with clickable elements
    if (links && links.length > 0) {
      links.forEach(([linkText, url]) => {
        const linkRegex = new RegExp(linkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
        processedText = processedText.replace(linkRegex, `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-un-blue hover:underline font-medium">${linkText}</a>`)
      })
    }
    
    // Highlight action verb if present (can appear anywhere in the text)
    if (actionVerb && actionVerb.trim()) {
      const verbRegex = new RegExp(`\\b(${actionVerb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'i')
      processedText = processedText.replace(verbRegex, `<span class="font-semibold text-un-blue">$1</span>`)
    }
    
    return processedText
  }

  return (
    <div className="space-y-4">
      <div ref={paragraphsTitleRef} className="pr-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
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

          {/* Filter buttons */}
          <div className="flex gap-1 items-center">
            <Button
              variant="ghost"
              size="sm"
              className={`text-xs h-7 border ${paragraphFilter === 'operative' ? '!border-un-blue !text-un-blue bg-un-blue/10 hover:!text-un-blue hover:bg-un-blue/20' : 'border-gray-200 hover:border-gray-300'}`}
              onClick={() => setParagraphFilter('operative')}
            >
              Operative
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`text-xs h-7 border ${paragraphFilter === 'all' ? '!border-un-blue !text-un-blue bg-un-blue/10 hover:!text-un-blue hover:bg-un-blue/20' : 'border-gray-200 hover:border-gray-300'}`}
              onClick={() => setParagraphFilter('all')}
            >
              All
            </Button>
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

                  // Check if this is a heading and if it has any visible paragraphs following it
                  const isHeading = paragraph.type === 'heading'
                  let hasVisibleParagraphsAfter = false
                  let hasHiddenParagraphsAfter = false
                  let nextHeadingIndex = -1
                  
                  if (isHeading) {
                    // Find the next heading at the same or higher level in filtered paragraphs
                    const currentLevel = paragraph.heading_level || 3
                    for (let i = index + 1; i < paragraphs.length; i++) {
                      const nextParagraph = paragraphs[i]
                      if (nextParagraph.type === 'heading' && (nextParagraph.heading_level || 3) <= currentLevel) {
                        nextHeadingIndex = i
                        break
                      }
                    }
                    
                    // Check if there are any non-heading paragraphs between this heading and the next in filtered results
                    const endIndex = nextHeadingIndex === -1 ? paragraphs.length : nextHeadingIndex
                    for (let i = index + 1; i < endIndex; i++) {
                      if (paragraphs[i].type !== 'heading') {
                        hasVisibleParagraphsAfter = true
                        break
                      }
                    }
                    
                    // Check if there are hidden paragraphs in this section (only if filtering and no visible paragraphs)
                    if (!hasVisibleParagraphsAfter && paragraphFilter !== 'all' && allParagraphs) {
                      // Find the corresponding heading in allParagraphs
                      const allHeadingIndex = allParagraphs.findIndex((p: Paragraph) => 
                        p.type === 'heading' && 
                        p.text === paragraph.text && 
                        p.prefix === paragraph.prefix
                      )
                      
                      if (allHeadingIndex !== -1) {
                        // Find the next heading at the same or higher level in all paragraphs
                        let allNextHeadingIndex = -1
                        for (let i = allHeadingIndex + 1; i < allParagraphs.length; i++) {
                          const nextParagraph = allParagraphs[i]
                          if (nextParagraph.type === 'heading' && (nextParagraph.heading_level || 3) <= currentLevel) {
                            allNextHeadingIndex = i
                            break
                          }
                        }
                        
                        // Check if there are any non-heading paragraphs that would match the filter
                        const allEndIndex = allNextHeadingIndex === -1 ? allParagraphs.length : allNextHeadingIndex
                        for (let i = allHeadingIndex + 1; i < allEndIndex; i++) {
                          const p = allParagraphs[i]
                          if (p.type !== 'heading') {
                            // Check if this paragraph would be hidden by current filter
                            const wouldBeVisible = paragraphFilter === 'operative' 
                              ? p.paragraph_type === 'operative'
                              : true // 'all' filter shows everything
                            
                            if (!wouldBeVisible) {
                              hasHiddenParagraphsAfter = true
                              break
                            }
                          }
                        }
                      }
                    }
                  }

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
                            <span dangerouslySetInnerHTML={{ 
                              __html: processText(paragraph.text, paragraph.action_verb, paragraph.links) 
                            }} />
                          </HeadingTag>
                        </div>
                        {/* Show disclaimer only if heading has hidden paragraphs due to filtering */}
                        {!hasVisibleParagraphsAfter && hasHiddenParagraphsAfter && (
                          <p className="text-xs text-muted-foreground italic mb-3">
                            No operative paragraphs in this section.
                          </p>
                        )}
                      </div>
                    )
                  }

                  // Regular paragraphs
                  return (
                    <div key={`${documentSymbol}-${index}`} className={`${indentClass}`}>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 max-w-[85%]">
                            <p className="text-sm leading-relaxed">
                              {paragraph.prefix && (
                                <span className="font-medium text-un-blue mr-2">
                                  {paragraph.prefix}
                                </span>
                              )}
                              <span dangerouslySetInnerHTML={{ 
                                __html: processText(paragraph.text, paragraph.action_verb, paragraph.links) 
                              }} />
                            </p>
                          </div>
                          <div className="flex-shrink-0 w-[15%] flex flex-col gap-1.5 items-end">
                            {/* Operative badge */}
                            {paragraph.paragraph_type === 'operative' && (
                              <Badge variant="outline" className="text-xs !border-un-blue !text-un-blue bg-un-blue/10">
                                Operative
                              </Badge>
                            )}
                            {/* Paragraph type badge for non-operative types */}
                            {paragraph.paragraph_type && paragraph.paragraph_type !== 'operative' && (
                              <Badge variant="outline" className="text-xs border-gray-300 text-gray-600 bg-gray-50">
                                {titleCase(paragraph.paragraph_type)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
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
          </div>
        )}
      </div>
    </div>
  )
} 