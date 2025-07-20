'use client'

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react'
import { useParams } from 'next/navigation'
import type { Mandate, CitationInfo } from '@/types'
import { getMandateDisplayTitle } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Building, FileCheck, Target } from 'lucide-react'
import { titleCase } from 'title-case'
import { getOriginDocumentDisplayName, getBudgetDocumentSlug } from '@/lib/budget-documents'
import { Skeleton } from '@/components/ui/skeleton'

const MetadataItem = ({ label, children }: { label: React.ReactNode, children: React.ReactNode }) => (
    <div className="flex items-baseline text-xs py-1">
        <div className="w-28 font-medium text-muted-foreground flex-shrink-0 pr-3">{label}</div>
        <div className="flex-grow">{children}</div>
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
    const [allEntities, setAllEntities] = useState<{ entity: string; entity_long: string }[]>([])

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
                } else {
                    throw new Error('Mandate not found')
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred')
            } finally {
                setLoading(false)
            }
        }

        const fetchEntities = async () => {
            try {
                // Fetch entities for entity lookup
                const response = await fetch('/api/mandates?limit=1')
                if (response.ok) {
                    const data = await response.json()
                    if (data.entities) {
                        setAllEntities(data.entities)
                    }
                }
            } catch (err) {
                // Silently fail for entities fetch - not critical
                console.warn('Failed to fetch entities:', err)
            }
        }

        if (documentSymbol) {
            fetchMandate()
            fetchEntities()
        }
    }, [documentSymbol])

    // Create entity lookup function
    const getEntityLongName = useCallback((shortName: string): string => {
        const entity = allEntities.find(e => e.entity === shortName)
        return entity?.entity_long || shortName
    }, [allEntities])

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
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Mandate Document</p>
                <h1 className="text-lg md:text-2xl font-bold mt-1 leading-tight">
                    {getMandateDisplayTitle(mandate)}
                </h1>
                <p className="mt-0.5 md:mt-1 text-xs md:text-sm text-muted-foreground">
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

                    {/* AI Summary */}
                    <div className="space-y-1">
                        <h3 className="text-base font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>Document Summary</span>
                        </h3>
                    </div>

                    {/* Compact Metadata List */}
                    <div className="space-y-1 rounded-lg">
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
                                <div className="flex flex-wrap gap-1">
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
                                                    window.open(url.toString(), '_blank');
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
                                <div className="flex flex-wrap gap-1 pt-2">
                                    {mandate.subject_headings
                                        .slice()
                                        .sort((a, b) => a.localeCompare(b))
                                        .map((heading, index) => (
                                            <Badge
                                                key={index}
                                                variant="outline"
                                                className="text-xs font-normal !border-un-blue cursor-pointer hover:bg-un-blue/10 transition-colors"
                                                onClick={() => {
                                                    // Open filtered results in a new window with only the subject filter
                                                    const url = new URL(window.location.origin + window.location.pathname);
                                                    url.searchParams.set('page', '1');
                                                    url.searchParams.set('subject', heading.trim());
                                                    window.open(url.toString(), '_blank');
                                                }}
                                            >
                                                {titleCase(heading.toLowerCase())}
                                            </Badge>
                                        ))}
                                </div>
                            </MetadataItem>
                        )}
                    </div>

                    {/* Operative Paragraphs Content */}
                    {mandate.paragraphs && mandate.paragraphs.length > 0 ? (
                        <div className="space-y-3">
                            <h3 className="text-base font-semibold flex items-center gap-2">
                                <FileCheck className="h-4 w-4" />
                                Paragraphs ({mandate.paragraphs.length})
                            </h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {mandate.paragraphs.map((paragraph, index) => (
                                    <div key={`${paragraph.paragraph_idx}-${paragraph.subparagraph_idx}-${index}`} className="bg-muted/30 rounded-lg p-3">
                                        <div className="flex items-start gap-2">
                                            <Badge variant="outline" className="text-xs mt-0.5 flex-shrink-0">
                                                {paragraph.paragraph_idx}.{paragraph.subparagraph_idx}
                                            </Badge>
                                            <div className="flex-1">
                                                <p className="text-sm leading-relaxed">{paragraph.paragraph_text}</p>
                                                {paragraph.is_operative && (
                                                    <Badge variant="secondary" className="text-xs mt-2">
                                                        Operative
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-muted/30 rounded-lg p-3">
                            <p className="text-sm leading-relaxed text-muted-foreground italic">
                                No paragraphs available for this document.
                            </p>
                        </div>
                    )}

                    {/* Entities Mentioned */}
                    {entityCounts.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-base font-semibold flex items-center gap-2">
                                <Building className="h-4 w-4" />
                                Entities Citing this Document ({entityCounts.length} total)
                            </h3>
                            <div className="space-y-1.5 text-xs">
                                {entityCounts.map(([shortName, data]) => (
                                    <div key={shortName} className="flex gap-2">
                                        <span className="text-muted-foreground font-mono flex-shrink-0 leading-[1.5] py-1">{data.count}x</span>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
                                            <Badge
                                                variant="secondary"
                                                className="text-xs w-fit px-2 py-1 !bg-un-blue !text-white hover:!bg-un-blue/90 cursor-pointer transition-colors"
                                                onClick={() => {
                                                    // Navigate to entity detail page
                                                    window.location.href = `/entity/${encodeURIComponent(shortName)}`;
                                                }}
                                            >
                                                {shortName}
                                            </Badge>
                                            <span className="text-muted-foreground break-words">{data.longName}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Programme Counts */}
                    {programmeCounts.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-base font-semibold flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                Programmes Citing this Document ({programmeCounts.length} total)
                            </h3>
                            <div className="space-y-1.5 text-xs">
                                {programmeCounts.map(([programmeTitle, count]) => (
                                    <div key={programmeTitle} className="flex items-center gap-2">
                                        <span className="text-muted-foreground font-mono flex-shrink-0">{count}x</span>
                                        <div className="min-w-0 flex-1">
                                            <Badge
                                                variant="secondary"
                                                className="text-xs px-2 py-1 whitespace-normal leading-relaxed inline-block max-w-full cursor-pointer hover:bg-secondary/80 transition-colors"
                                                onClick={() => {
                                                    // Open filtered results in a new window with only the programme filter
                                                    const url = new URL(window.location.origin + '/');
                                                    url.searchParams.set('page', '1');
                                                    url.searchParams.set('programme', programmeTitle);
                                                    window.open(url.toString(), '_blank');
                                                }}
                                            >
                                                {titleCase(programmeTitle)}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
