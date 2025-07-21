'use client'

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react'
import { useParams } from 'next/navigation'
import type { Mandate, CitationInfo, OperativeParagraph } from '@/types'
import { getMandateDisplayTitle, getDeliverableTypeLabel, DELIVERABLE_TYPE_LABELS } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Building, FileCheck, Target, HelpCircle } from 'lucide-react'
import { titleCase } from 'title-case'
import { getOriginDocumentDisplayName, getBudgetDocumentSlug } from '@/lib/budget-documents'
import { Skeleton } from '@/components/ui/skeleton'
import { explainerTexts } from '@/lib/explainer-texts'

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
    const documentSymbol = segments.join('/')

    const [mandate, setMandate] = useState<Mandate | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [entityMap, setEntityMap] = useState<Map<string, { entity: string; entity_long: string }>>(new Map())

    // State for expandable sections
    const [showAllEntities, setShowAllEntities] = useState(false)
    const [showAllProgrammes, setShowAllProgrammes] = useState(false)
    const [openTooltip, setOpenTooltip] = useState<string | null>(null)
    const [paragraphFilter, setParagraphFilter] = useState<'all' | 'operative' | 'non-operative'>('operative')
    const [deliverableTypeFilter, setDeliverableTypeFilter] = useState<string | null>(null)
    const [deliverableDropdownPosition, setDeliverableDropdownPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

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
            if (openTooltip === 'deliverable-types') {
                setOpenTooltip(null);
            }
        };

        const handleResize = () => {
            if (openTooltip === 'deliverable-types') {
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

    const handleDeliverableTypeToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();
        
        // Position the dropdown below the button
        setDeliverableDropdownPosition({
            x: rect.left,
            y: rect.bottom + 8
        });
        
        toggleTooltip('deliverable-types');
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

    const groupedParagraphs = useMemo(() => {
        if (!mandate || !mandate.paragraphs) return []

        const groups: { [key: number]: OperativeParagraph[] } = {}

        mandate.paragraphs.forEach(paragraph => {
            if (!groups[paragraph.paragraph_idx]) {
                groups[paragraph.paragraph_idx] = []
            }
            groups[paragraph.paragraph_idx].push(paragraph)
        })

        // Sort groups by paragraph_idx and subparagraphs by subparagraph_idx
        return Object.keys(groups)
            .map(Number)
            .sort((a, b) => a - b)
            .map(paragraphIdx => ({
                paragraph_idx: paragraphIdx,
                subparagraphs: groups[paragraphIdx].sort((a, b) => a.subparagraph_idx - b.subparagraph_idx)
            }))
    }, [mandate])

    // Filter paragraphs based on the selected filter
    const filteredParagraphs = useMemo(() => {
        let filtered = groupedParagraphs;
        
        // Filter by operative/non-operative
        if (paragraphFilter !== 'all') {
            filtered = filtered.filter(group => {
                const isOperative = group.subparagraphs.some(sub => sub.is_op_para)
                return paragraphFilter === 'operative' ? isOperative : !isOperative
            })
        }
        
        // Filter by deliverable type
        if (deliverableTypeFilter) {
            filtered = filtered.map(group => {
                // Filter subparagraphs that match the deliverable type
                const matchingSubparagraphs = group.subparagraphs.filter(sub => 
                    sub.deliverable_type && sub.deliverable_type.includes(deliverableTypeFilter)
                );
                
                // If any subparagraphs match, return the group with all its subparagraphs
                // (but we'll only show the matching ones in the UI if needed)
                if (matchingSubparagraphs.length > 0) {
                    return group;
                }
                return null;
            }).filter(Boolean) as typeof groupedParagraphs;
        }
        
        return filtered;
    }, [groupedParagraphs, paragraphFilter, deliverableTypeFilter])

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
        <div className="pb-20">
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
            <div className="flex-grow overflow-y-auto overflow-x-hidden">
                <div className="space-y-4 pr-2">

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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                            {/* Entities Mentioned */}
                            {entityCounts.length > 0 && (
                                <div className="space-y-2">
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
                                <div className="space-y-2">
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

                    {/* Operative Paragraphs */}
                    {mandate.paragraphs && mandate.paragraphs.length > 0 ? (
                        <div className="space-y-3">
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
                                    {/* Deliverable type filter */}
                                    <div className="relative tooltip-container">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs h-7 border !border-emerald-400 !text-emerald-700 bg-emerald-50 hover:!text-emerald-700 hover:bg-emerald-100"
                                            onClick={handleDeliverableTypeToggle}
                                        >
                                            {deliverableTypeFilter ? getDeliverableTypeLabel(deliverableTypeFilter) : 'Deliverable Types'}
                                        </Button>
                                        {openTooltip === 'deliverable-types' && (
                                            <div className="fixed z-[9999] w-60 p-3 bg-white border rounded-md shadow-lg text-sm font-normal" 
                                                 style={{
                                                     left: `${deliverableDropdownPosition.x}px`,
                                                     top: `${deliverableDropdownPosition.y}px`
                                                 }}>
                                                <p className="font-medium mb-2">Filter by Deliverable Type</p>
                                                <div className="space-y-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="w-full justify-start text-xs h-6 border border-gray-200 hover:!border-emerald-400 hover:!text-emerald-700 hover:bg-emerald-50"
                                                        onClick={() => {
                                                            setDeliverableTypeFilter(null);
                                                            setOpenTooltip(null);
                                                        }}
                                                    >
                                                        All Types
                                                    </Button>
                                                    {Object.entries(DELIVERABLE_TYPE_LABELS).map(([key, label]) => (
                                                        <Button
                                                            key={key}
                                                            variant="ghost"
                                                            size="sm"
                                                            className={`w-full justify-start text-xs h-6 border ${deliverableTypeFilter === key ? '!border-emerald-400 !text-emerald-700 bg-emerald-50 hover:!border-emerald-400 hover:!text-emerald-700 hover:bg-emerald-100' : 'border-gray-200 hover:!border-emerald-400 hover:!text-emerald-700 hover:bg-emerald-50'}`}
                                                            onClick={() => {
                                                                setDeliverableTypeFilter(key);
                                                                setOpenTooltip(null);
                                                            }}
                                                        >
                                                            {label}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Separator */}
                                    <div className="h-5 w-px bg-gray-300 mx-1"></div>
                                    
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
                            <div className="space-y-3 max-h-[800px] overflow-y-auto overflow-x-visible pr-4">
                                {filteredParagraphs.map((group) => (
                                    <div key={group.paragraph_idx} className="space-y-2">
                                        {/* Paragraph Header with paragraph_text */}
                                        <div className="bg-muted/30 rounded-lg p-3">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-1 max-w-[75%]">
                                                    {group.subparagraphs[0]?.paragraph_text && (
                                                        <p className="text-sm leading-relaxed">
                                                            {group.subparagraphs[0].paragraph_text}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex-shrink-0 w-[25%] flex justify-end">
                                                    {group.subparagraphs.some(sub => sub.is_op_para) && (
                                                        <Badge variant="outline" className="text-xs !border-un-blue !text-un-blue bg-un-blue/10">
                                                            Operative
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Subparagraphs - indented with their own boxes showing subparagraph_text */}
                                        <div className="ml-6 space-y-2">
                                            {group.subparagraphs
                                                .filter(subparagraph => {
                                                    // If no deliverable type filter, show all subparagraphs
                                                    if (!deliverableTypeFilter) return true;
                                                    // If deliverable type filter is active, only show matching subparagraphs
                                                    return subparagraph.deliverable_type && 
                                                           subparagraph.deliverable_type.includes(deliverableTypeFilter);
                                                })
                                                .map((subparagraph, subIndex) => (
                                                subparagraph.subparagraph_text && (
                                                    <div key={`${group.paragraph_idx}-${subparagraph.subparagraph_idx}`} className="bg-muted/20 rounded-lg p-3">
                                                        <div className="flex items-start gap-4">
                                                            <div className="flex-1 max-w-[75%]">
                                                                <p className="text-sm leading-relaxed">
                                                                    {subparagraph.subparagraph_text}
                                                                </p>
                                                            </div>
                                                            <div className="flex-shrink-0 w-[25%] flex flex-col gap-1.5 items-end">
                                                                {/* Deliverable type badges - stacked vertically */}
                                                                {subparagraph.deliverable_type && subparagraph.deliverable_type.length > 0 && (
                                                                    <div className="flex flex-col gap-1 items-end">
                                                                        {subparagraph.deliverable_type.map((type, typeIndex) => (
                                                                            <Badge 
                                                                                key={typeIndex} 
                                                                                variant="outline" 
                                                                                className="text-xs !border-emerald-400 !text-emerald-700 bg-emerald-50 text-right"
                                                                            >
                                                                                {getDeliverableTypeLabel(type)}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
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
