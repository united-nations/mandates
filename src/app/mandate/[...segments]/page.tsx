'use client'

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react'
import { useParams } from 'next/navigation'
import type { Mandate, CitationInfo } from '@/types'
import { getMandateDisplayTitle } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Building, FileCheck, Target, HelpCircle } from 'lucide-react'
import { titleCase } from 'title-case'
import { getOriginDocumentDisplayName, getBudgetDocumentSlug } from '@/lib/budget-documents'
import { Skeleton } from '@/components/ui/skeleton'
import { explainerTexts } from '@/lib/explainer-texts'
import { useParagraphs } from '@/hooks/use-paragraphs'

const MetadataItem = ({ label, children }: { label: React.ReactNode, children: React.ReactNode }) => (
    <div className="flex items-center gap-3 text-sm py-1.5">
        <div className="font-medium text-muted-foreground flex-shrink-0 w-[120px]">{label}</div>
        <div className="text-foreground flex-1">{children}</div>
    </div>
)

function MandatePageContent() {
    const params = useParams()
    const segments = params.segments as string[]

    // Reconstruct the full document symbol from segments
    // URL decode each segment first, then join
    const documentSymbol = segments.map(segment => decodeURIComponent(segment)).join('/')

    const [mandate, setMandate] = useState<Mandate | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [entityMap, setEntityMap] = useState<Map<string, { entity: string; entity_long: string }>>(new Map())

    // State for expandable sections
    const [showAllEntities, setShowAllEntities] = useState(false)
    const [showAllProgrammes, setShowAllProgrammes] = useState(false)
    const [openTooltip, setOpenTooltip] = useState<string | null>(null)
    const [paragraphFilter, setParagraphFilter] = useState<'all' | 'operative' | 'non-operative'>('operative')

    // TOC state management - only track active heading, expansion is automatic
    const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null)

    useEffect(() => {
        const fetchMandate = async () => {
            try {
                setLoading(true)
                setError(null)

                // Fetch the mandate by document symbol using the exact match filter
                const response = await fetch(`/api/mandates?full_document_symbol=${encodeURIComponent(documentSymbol)}&limit=1`)

                if (!response.ok) {
                    throw new Error('Failed to fetch mandate')
                }

                const data = await response.json()

                // Since we're using exact match filter, we should get exactly one result or none
                if (data.mandates && data.mandates.length > 0) {
                    setMandate(data.mandates[0])

                    // Build entity map from the reference data that's already provided by the API
                    if (data.reference?.entities) {
                        const map = new Map()
                        data.reference.entities.forEach((entity: any) => {
                            map.set(entity.entity, entity)
                        })
                        setEntityMap(map)
                    }
                } else {
                    throw new Error('Mandate not found')
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred')
            } finally {
                setLoading(false)
            }
        }

        if (documentSymbol) {
            fetchMandate()
        }
    }, [documentSymbol])

    // Close tooltip when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.tooltip-container')) {
                setOpenTooltip(null);
            }
        };

        const handleScroll = () => {
            if (openTooltip === 'paragraphs-beta') {
                setOpenTooltip(null);
            }
        };

        const handleResize = () => {
            if (openTooltip === 'paragraphs-beta') {
                setOpenTooltip(null);
            }
        };

        if (openTooltip) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScroll, true);
            window.addEventListener('resize', handleResize);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                window.removeEventListener('scroll', handleScroll, true);
                window.removeEventListener('resize', handleResize);
            };
        }
    }, [openTooltip]);

    const toggleTooltip = (tooltipId: string) => {
        setOpenTooltip(openTooltip === tooltipId ? null : tooltipId);
    };

    // Create entity lookup function using the API-provided entity map
    const getEntityLongName = useCallback((shortName: string): string => {
        const entity = entityMap.get(shortName)
        return entity?.entity_long || shortName
    }, [entityMap])

    const entityCounts = useMemo(() => {
        if (!mandate || !mandate.citation_info) return []

        const counts: { [key: string]: { longName: string; count: number } } = {}

        mandate.citation_info.forEach(citation => {
            const shortName = citation.entity
            if (shortName) {
                if (!counts[shortName]) {
                    // Use lookup function instead of citation data
                    counts[shortName] = {
                        longName: getEntityLongName(shortName),
                        count: 0
                    }
                }
                counts[shortName].count++
            }
        })

        return Object.entries(counts).sort(([shortNameA, dataA], [shortNameB, dataB]) => {
            if (dataB.count !== dataA.count) {
                return dataB.count - dataA.count
            }
            return shortNameA.localeCompare(shortNameB)
        })
    }, [mandate, getEntityLongName])

    const programmeCounts = useMemo(() => {
        if (!mandate || !mandate.citation_info) return []

        const counts: { [key: string]: number } = {}

        mandate.citation_info.forEach(citation => {
            const programmeTitle = citation.programme_title
            if (programmeTitle) {
                if (!counts[programmeTitle]) {
                    counts[programmeTitle] = 0
                }
                counts[programmeTitle]++
            }
        })

        return Object.entries(counts).sort(([titleA, countA], [titleB, countB]) => {
            if (countB !== countA) {
                return countB - countA
            }
            return titleA.localeCompare(titleB)
        })
    }, [mandate])

    const budgetDocuments = useMemo(() => {
        if (!mandate || !mandate.citation_info) return []
        const uniqueDocs = new Set<string>()
        mandate.citation_info.forEach(citation => {
            if (citation.origin_document) {
                uniqueDocs.add(citation.origin_document)
            }
        })
        return Array.from(uniqueDocs)
    }, [mandate])

    // Use the new paragraphs API - always fetch all paragraphs
    const {
        paragraphs: allParagraphs,
        isLoading: paragraphsLoading,
        error: paragraphsError
    } = useParagraphs({
        full_document_symbol: documentSymbol,
        // Always fetch all paragraphs, filtering will be done in frontend
        is_op_para: undefined
    });

    // Frontend filtering of paragraphs
    const paragraphs = useMemo(() => {
        if (!allParagraphs) return allParagraphs;
        
        if (paragraphFilter === 'all') {
            return allParagraphs;
        }
        
        return allParagraphs.filter(paragraph => {
            // Always show headings
            if (paragraph.type === 'heading') {
                return true;
            }
            
            // Filter based on paragraph type
            if (paragraphFilter === 'operative') {
                return paragraph.paragraph_type === 'operative';
            } else if (paragraphFilter === 'non-operative') {
                return paragraph.paragraph_type !== 'operative';
            }
            
            return true;
        });
    }, [allParagraphs, paragraphFilter]);

    // TOC data structure
    interface TOCItem {
        id: string;
        text: string;
        level: number;
        children: TOCItem[];
        index: number;
    }

    // Build TOC from paragraphs
    const tocItems = useMemo((): TOCItem[] => {
        if (!paragraphs || paragraphs.length === 0) return [];

        const items: TOCItem[] = [];
        const stack: TOCItem[] = [];

        paragraphs.forEach((paragraph, index) => {
            if (paragraph.type === 'heading') {
                const level = paragraph.heading_level || 3;
                // Include prefix in TOC text if it exists
                const displayText = paragraph.prefix 
                    ? `${paragraph.prefix} ${paragraph.text}`
                    : paragraph.text;
                const item: TOCItem = {
                    id: `heading-${index}`,
                    text: displayText,
                    level,
                    children: [],
                    index
                };

                // Remove items from stack that are at same or deeper level
                while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                    stack.pop();
                }

                if (stack.length === 0) {
                    // Top-level item
                    items.push(item);
                } else {
                    // Child item
                    stack[stack.length - 1].children.push(item);
                }

                stack.push(item);
            }
        });

        return items;
    }, [paragraphs]);

    // Helper function to check if a section should be expanded based on active heading
    const isInActivePath = useCallback((item: TOCItem): boolean => {
        if (!activeHeadingId) return false;
        
        // Check if this item or any of its descendants is active
        const checkDescendants = (currentItem: TOCItem): boolean => {
            if (currentItem.id === activeHeadingId) return true;
            return currentItem.children.some(child => checkDescendants(child));
        };
        
        return checkDescendants(item);
    }, [activeHeadingId]);

    // Intersection Observer for scroll detection
    useEffect(() => {
        if (!paragraphs || paragraphs.length === 0 || tocItems.length === 0) return;

        const headingElements = paragraphs
            .map((paragraph, index) => {
                if (paragraph.type === 'heading') {
                    return document.getElementById(`heading-${index}`);
                }
                return null;
            })
            .filter(Boolean) as HTMLElement[];

        if (headingElements.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                // Find the heading that's most visible
                let mostVisible = entries[0];
                entries.forEach(entry => {
                    if (entry.intersectionRatio > mostVisible.intersectionRatio) {
                        mostVisible = entry;
                    }
                });

                if (mostVisible.isIntersecting) {
                    setActiveHeadingId(mostVisible.target.id);
                }
            },
            {
                rootMargin: '-20% 0px -60% 0px', // Trigger when heading is in upper portion of viewport
                threshold: [0, 0.25, 0.5, 0.75, 1]
            }
        );

        headingElements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, [paragraphs, tocItems]);

    // TOC navigation handler
    const handleTOCClick = (headingId: string) => {
        const element = document.getElementById(headingId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Render TOC items recursively
    const renderTOCItem = (item: TOCItem, isTopLevel: boolean = false): React.ReactNode => {
        const isActive = activeHeadingId === item.id;
        const hasChildren = item.children.length > 0;
        const shouldExpand = isInActivePath(item);
        
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
        );
    };

    if (loading) {
        return (
            <div className="pb-8">
                <div className="mb-6">
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-6 w-48" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
            </div>
        )
    }

    if (error || !mandate) {
        return (
            <div className="pb-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-red-600">Mandate Not Found</h1>
                    <p className="text-muted-foreground mt-2">
                        Could not find mandate with document symbol: <code className="bg-muted px-2 py-1 rounded">{documentSymbol}</code>
                    </p>
                </div>
            </div>
        )
    }

    const hasSubjects = mandate.subject_headings && mandate.subject_headings.length > 0
    const displaySymbol = mandate.full_document_symbol
    const pdfUrl = mandate.link

    return (
        <div className="pb-12">
            {/* Header */}
            <div className="border-b pr-12 pb-2 md:pb-4 mb-8">
                <p className="text-base md:text-lg font-medium text-muted-foreground">Mandate Document</p>
                <h1 className="text-lg md:text-2xl font-bold mt-1 leading-tight">
                    {getMandateDisplayTitle(mandate)}
                </h1>
                <p className="mt-0.5 md:mt-1 text-sm md:text-base text-muted-foreground font-mono">
                    {displaySymbol}
                </p>
                {pdfUrl ? (
                    <Button asChild className="mt-1.5 md:mt-4 h-7 md:h-10 text-xs md:text-sm !bg-trout !text-white hover:!bg-trout/90 transition-colors">
                        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 md:gap-2">
                            <FileText className="h-3 w-3 md:h-4 md:w-4" />
                            View PDF
                        </a>
                    </Button>
                ) : (
                    <Button disabled variant="primary" className="mt-1.5 md:mt-4 h-7 md:h-10 text-xs md:text-sm !bg-trout/50 !text-white/70 inline-flex items-center gap-1.5 md:gap-2">
                        <FileText className="h-3 w-3 md:h-4 md:w-4" />
                        View PDF
                    </Button>
                )}
            </div>

            {/* Content */}
            <div>
                <div className="space-y-10 pr-2">

                    {/* Compact Metadata List */}
                    <div className="space-y-0 rounded-lg">
                        <MetadataItem label="Organ">
                            {mandate.body ? (
                                <Badge
                                    variant="stronger"
                                    className="text-xs cursor-pointer hover:bg-primary/80 transition-colors"
                                    onClick={() => {
                                        // Navigate to organ detail page
                                        window.location.href = `/organ/${encodeURIComponent(mandate.body)}`;
                                    }}
                                >
                                    {mandate.body}
                                </Badge>
                            ) : (
                                <span className="text-muted-foreground">—</span>
                            )}
                        </MetadataItem>
                        <MetadataItem label="Document Type">
                            {mandate.type ? <Badge variant="stronger" className="text-xs">{mandate.type}</Badge> : <span className="text-muted-foreground">—</span>}
                        </MetadataItem>
                        <MetadataItem label="Year">
                            {mandate.year ? <Badge variant="stronger" className="text-xs">{mandate.year}</Badge> : <span className="text-muted-foreground">—</span>}
                        </MetadataItem>
                        <MetadataItem label="Budget Document">
                            {budgetDocuments.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {budgetDocuments.map((doc, index) => {
                                        const displayName = getOriginDocumentDisplayName(doc);
                                        const slug = getBudgetDocumentSlug(displayName);

                                        return (
                                            <Badge
                                                key={index}
                                                variant="stronger"
                                                className="text-xs cursor-pointer hover:bg-primary/80 transition-colors"
                                                onClick={() => {
                                                    // Navigate to filtered results using the budget document slug
                                                    const url = new URL(window.location.origin + '/');
                                                    url.searchParams.set('page', '1');
                                                    url.searchParams.set('budget_document', slug);
                                                    window.location.href = url.toString();
                                                }}
                                            >
                                                {displayName}
                                            </Badge>
                                        );
                                    })}
                                </div>
                            ) : (
                                <span className="text-muted-foreground">—</span>
                            )}
                        </MetadataItem>
                        {mandate.subject_headings && mandate.subject_headings.length > 0 && (
                            <MetadataItem
                                label={
                                    <a href="https://metadata.un.org/thesaurus/" target="_blank" rel="noopener noreferrer" className="hover:underline">
                                        UN Library Subjects
                                    </a>
                                }
                            >
                                <div className="flex flex-wrap gap-1.5">
                                    {mandate.subject_headings
                                        .slice()
                                        .sort((a, b) => a.localeCompare(b))
                                        .map((heading, index) => (
                                            <Badge
                                                key={index}
                                                variant="outline"
                                                className="text-xs font-normal !border-un-blue cursor-pointer hover:bg-un-blue/10 transition-colors"
                                                onClick={() => {
                                                    // Navigate to filtered results with only the subject filter
                                                    const url = new URL(window.location.origin + '/');
                                                    url.searchParams.set('page', '1');
                                                    url.searchParams.set('subject', heading.trim());
                                                    window.location.href = url.toString();
                                                }}
                                            >
                                                {titleCase(heading.toLowerCase())}
                                            </Badge>
                                        ))}
                                </div>
                            </MetadataItem>
                        )}
                    </div>

                    {/* Citations Layout - Side by side on larger screens, stacked on smaller */}
                    {(entityCounts.length > 0 || programmeCounts.length > 0) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                            {/* Entities Mentioned */}
                            {entityCounts.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-base font-semibold flex items-center gap-2">
                                        <Building className="h-4 w-4" />
                                        {entityCounts.length} {entityCounts.length === 1 ? 'Entity' : 'Entities'} Citing this Document
                                    </h3>
                                    <div className="space-y-1.5 text-xs">
                                        {(showAllEntities ? entityCounts : entityCounts.slice(0, 5)).map(([shortName, data]) => (
                                            <div key={shortName} className="flex items-center gap-2">
                                                <span className="text-muted-foreground font-mono flex-shrink-0">{data.count}x</span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-xs px-2 py-1 !bg-un-blue !text-white hover:!bg-un-blue/90 cursor-pointer transition-colors flex-shrink-0"
                                                            onClick={() => {
                                                                // Navigate to entity detail page
                                                                window.location.href = `/entity/${encodeURIComponent(shortName)}`;
                                                            }}
                                                        >
                                                            {shortName}
                                                        </Badge>
                                                        <span className="text-muted-foreground text-xs truncate" title={data.longName}>
                                                            {data.longName}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {entityCounts.length > 5 && (
                                            <div className="mt-2 w-full">
                                                <button
                                                    onClick={() => setShowAllEntities(!showAllEntities)}
                                                    className="text-sm text-un-blue hover:text-un-blue/80 text-left inline-block"
                                                >
                                                    {showAllEntities
                                                        ? 'Show less'
                                                        : `Show ${entityCounts.length - 5} more`
                                                    }
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Programme Counts */}
                            {programmeCounts.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-base font-semibold flex items-center gap-2">
                                        <Target className="h-4 w-4" />
                                        {programmeCounts.length} {programmeCounts.length === 1 ? 'Programme' : 'Programmes'} Citing this Document
                                    </h3>
                                    <div className="space-y-1.5 text-xs">
                                        {(showAllProgrammes ? programmeCounts : programmeCounts.slice(0, 5)).map(([programmeTitle, count]) => (
                                            <div key={programmeTitle} className="flex items-center gap-2">
                                                <span className="text-muted-foreground font-mono flex-shrink-0">{count}x</span>
                                                <div className="min-w-0 flex-1">
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs px-2 py-1 whitespace-normal leading-relaxed inline-block max-w-full cursor-pointer hover:bg-secondary/80 transition-colors"
                                                        onClick={() => {
                                                            // Navigate to filtered results with only the programme filter
                                                            const url = new URL(window.location.origin + '/');
                                                            url.searchParams.set('page', '1');
                                                            url.searchParams.set('programme', programmeTitle);
                                                            window.location.href = url.toString();
                                                        }}
                                                    >
                                                        {titleCase(programmeTitle)}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                        {programmeCounts.length > 5 && (
                                            <div className="mt-2 w-full">
                                                <button
                                                    onClick={() => setShowAllProgrammes(!showAllProgrammes)}
                                                    className="text-sm text-un-blue hover:text-un-blue/80 text-left inline-block"
                                                >
                                                    {showAllProgrammes
                                                        ? 'Show less'
                                                        : `Show ${programmeCounts.length - 5} more`
                                                    }
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Paragraphs Section with TOC */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pr-4">
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
                                    className={`text-xs h-7 border ${paragraphFilter === 'non-operative' ? '!border-un-blue !text-un-blue bg-un-blue/10 hover:!text-un-blue hover:bg-un-blue/20' : 'border-gray-200 hover:border-gray-300'}`}
                                    onClick={() => setParagraphFilter('non-operative')}
                                >
                                    Non-operative
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

                        {/* Paragraphs Content with TOC Layout */}
                        <div className="flex gap-8">
                            {/* Main paragraph content - narrower to make room for TOC */}
                            <div className="flex-1 max-w-[65%]">
                                <div className="pr-4">
                                    {paragraphsLoading ? (
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
                                    ) : paragraphsError ? (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                            <p className="text-red-700">Error loading paragraphs: {paragraphsError}</p>
                                        </div>
                                    ) : paragraphs && paragraphs.length > 0 ? (
                                        <div className="space-y-4">
                                            {paragraphs.map((paragraph, index) => {
                                                // Helper function to process text with links and action verbs
                                                const processText = (text: string, actionVerb: string | null, links: [string, string][]) => {
                                                    let processedText = text;
                                                    
                                                    // Replace links with clickable elements
                                                    if (links && links.length > 0) {
                                                        links.forEach(([linkText, url]) => {
                                                            const linkRegex = new RegExp(linkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                                                            processedText = processedText.replace(linkRegex, `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-un-blue hover:underline font-medium">${linkText}</a>`);
                                                        });
                                                    }
                                                    
                                                    // Highlight action verb if present (can appear anywhere in the text)
                                                    if (actionVerb && actionVerb.trim()) {
                                                        const verbRegex = new RegExp(`\\b(${actionVerb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'i');
                                                        processedText = processedText.replace(verbRegex, `<span class="font-semibold text-un-blue">$1</span>`);
                                                    }
                                                    
                                                    return processedText;
                                                };

                                                // Calculate indentation based on paragraph_level
                                                const indentLevel = paragraph.paragraph_level || 0;
                                                const getIndentClass = (level: number): string => {
                                                    if (level <= 1) return '';
                                                    switch (level) {
                                                        case 2: return 'ml-6';
                                                        case 3: return 'ml-12';
                                                        case 4: return 'ml-18';
                                                        case 5: return 'ml-24';
                                                        case 6: return 'ml-30';
                                                        case 7: return 'ml-36';
                                                        case 8: return 'ml-42';
                                                        default: return 'ml-48'; // For very deep nesting
                                                    }
                                                };
                                                const indentClass = getIndentClass(indentLevel);

                                                // Generate unique ID for headings (for TOC navigation)
                                                const headingId = paragraph.type === 'heading' ? `heading-${index}` : undefined;

                                                // Check if this is a heading and if it has any visible paragraphs following it
                                                const isHeading = paragraph.type === 'heading';
                                                let hasVisibleParagraphsAfter = false;
                                                let hasHiddenParagraphsAfter = false;
                                                let nextHeadingIndex = -1;
                                                
                                                if (isHeading) {
                                                    // Find the next heading at the same or higher level in filtered paragraphs
                                                    const currentLevel = paragraph.heading_level || 3;
                                                    for (let i = index + 1; i < paragraphs.length; i++) {
                                                        const nextParagraph = paragraphs[i];
                                                        if (nextParagraph.type === 'heading' && (nextParagraph.heading_level || 3) <= currentLevel) {
                                                            nextHeadingIndex = i;
                                                            break;
                                                        }
                                                    }
                                                    
                                                    // Check if there are any non-heading paragraphs between this heading and the next in filtered results
                                                    const endIndex = nextHeadingIndex === -1 ? paragraphs.length : nextHeadingIndex;
                                                    for (let i = index + 1; i < endIndex; i++) {
                                                        if (paragraphs[i].type !== 'heading') {
                                                            hasVisibleParagraphsAfter = true;
                                                            break;
                                                        }
                                                    }
                                                    
                                                    // Check if there are hidden paragraphs in this section (only if filtering and no visible paragraphs)
                                                    if (!hasVisibleParagraphsAfter && paragraphFilter !== 'all' && allParagraphs) {
                                                        // Find the corresponding heading in allParagraphs
                                                        const allHeadingIndex = allParagraphs.findIndex(p => 
                                                            p.type === 'heading' && 
                                                            p.text === paragraph.text && 
                                                            p.prefix === paragraph.prefix
                                                        );
                                                        
                                                        if (allHeadingIndex !== -1) {
                                                            // Find the next heading at the same or higher level in all paragraphs
                                                            let allNextHeadingIndex = -1;
                                                            for (let i = allHeadingIndex + 1; i < allParagraphs.length; i++) {
                                                                const nextParagraph = allParagraphs[i];
                                                                if (nextParagraph.type === 'heading' && (nextParagraph.heading_level || 3) <= currentLevel) {
                                                                    allNextHeadingIndex = i;
                                                                    break;
                                                                }
                                                            }
                                                            
                                                            // Check if there are any non-heading paragraphs that would match the filter
                                                            const allEndIndex = allNextHeadingIndex === -1 ? allParagraphs.length : allNextHeadingIndex;
                                                            for (let i = allHeadingIndex + 1; i < allEndIndex; i++) {
                                                                const p = allParagraphs[i];
                                                                if (p.type !== 'heading') {
                                                                    // Check if this paragraph would be hidden by current filter
                                                                    const wouldBeVisible = paragraphFilter === 'operative' 
                                                                        ? p.paragraph_type === 'operative'
                                                                        : p.paragraph_type !== 'operative';
                                                                    
                                                                    if (!wouldBeVisible) {
                                                                        hasHiddenParagraphsAfter = true;
                                                                        break;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }

                                                // Handle different content types
                                                if (paragraph.type === 'heading') {
                                                    const HeadingTag = `h${Math.min(paragraph.heading_level || 3, 6)}` as keyof JSX.IntrinsicElements;
                                                    const headingClasses = {
                                                        1: 'text-lg font-bold',
                                                        2: 'text-base font-bold',
                                                        3: 'text-base font-semibold',
                                                        4: 'text-sm font-semibold',
                                                        5: 'text-sm font-medium',
                                                        6: 'text-sm font-medium'
                                                    };
                                                    const headingClass = headingClasses[paragraph.heading_level as keyof typeof headingClasses] || headingClasses[3];

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
                                                                    No {paragraphFilter === 'operative' ? 'operative' : 'non-operative'} paragraphs in this section.
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
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
                                                );
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

                            {/* Floating TOC - Right side, only for paragraphs section */}
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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function MandatePage() {
    return (
        <Suspense fallback={
            <div className="pb-8">
                <Skeleton className="h-8 w-64 mb-4" />
                <Skeleton className="h-32 w-full" />
            </div>
        }>
            <MandatePageContent />
        </Suspense>
    )
}
