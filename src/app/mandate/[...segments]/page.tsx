'use client'

import { Suspense, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { FileText, Calendar, Building, Link as LinkIcon, ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getMandateDisplayTitle } from '@/lib/utils'
import { getOriginDocumentDisplayName, getBudgetDocumentSlug } from '@/lib/budget-documents'
import { titleCase } from 'title-case'
import NextLink from 'next/link'
import type { Mandate } from '@/types'

const MetadataItem = ({ label, children }: { label: React.ReactNode, children: React.ReactNode }) => (
    <div className="flex items-baseline text-sm py-2">
        <div className="w-32 font-medium text-muted-foreground flex-shrink-0 pr-4">{label}</div>
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

        if (documentSymbol) {
            fetchMandate()
        }
    }, [documentSymbol])

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

    const budgetDocuments = mandate.citation_info
        ? Array.from(new Set(mandate.citation_info.map(c => c.origin_document).filter(Boolean)))
        : []

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-start gap-4 mb-4">
                    <div className="flex-1">
                        <p className="text-lg font-medium text-muted-foreground mb-1">Mandate Document</p>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">
                            {getMandateDisplayTitle(mandate)}
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            {mandate.full_document_symbol}
                        </p>
                    </div>
                </div>

                {mandate.link ? (
                    <Button asChild className="!bg-trout !text-white hover:!bg-trout/90">
                        <a href={mandate.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            View PDF Document
                        </a>
                    </Button>
                ) : (
                    <Button disabled variant="secondary" className="inline-flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        PDF Not Available
                    </Button>
                )}
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Operative Paragraphs */}
                    {mandate.paragraphs && mandate.paragraphs.length > 0 && (
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-xl font-semibold mb-4">
                                Paragraphs ({mandate.paragraphs.length})
                            </h2>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {mandate.paragraphs.map((paragraph, index) => (
                                    <div key={`${paragraph.paragraph_idx}-${paragraph.subparagraph_idx}-${index}`} className="bg-muted/30 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <Badge variant="outline" className="text-sm mt-1 flex-shrink-0">
                                                {paragraph.paragraph_idx}.{paragraph.subparagraph_idx}
                                            </Badge>
                                            <div className="flex-1">
                                                <p className="leading-relaxed">{paragraph.paragraph_text}</p>
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
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Basic Information */}
                    <div className="bg-white rounded-lg border p-6">
                        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                        <div className="space-y-1">
                            <MetadataItem label="Organ">
                                {mandate.body ? (
                                    <NextLink href={`/organ/${encodeURIComponent(mandate.body)}`}>
                                        <Badge variant="stronger" className="cursor-pointer hover:bg-primary/80 transition-colors">
                                            {mandate.body}
                                        </Badge>
                                    </NextLink>
                                ) : (
                                    <span className="text-muted-foreground">—</span>
                                )}
                            </MetadataItem>

                            <MetadataItem label="Document Type">
                                {mandate.type ? (
                                    <Badge variant="stronger">{mandate.type}</Badge>
                                ) : (
                                    <span className="text-muted-foreground">—</span>
                                )}
                            </MetadataItem>

                            <MetadataItem label="Year">
                                {mandate.year ? (
                                    <Badge variant="stronger">{mandate.year}</Badge>
                                ) : (
                                    <span className="text-muted-foreground">—</span>
                                )}
                            </MetadataItem>

                            <MetadataItem label="Budget Documents">
                                {budgetDocuments.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {budgetDocuments.map((doc, index) => {
                                            const displayName = getOriginDocumentDisplayName(doc)
                                            const slug = getBudgetDocumentSlug(displayName)

                                            return (
                                                <Badge
                                                    key={index}
                                                    variant="stronger"
                                                    className="cursor-pointer hover:bg-primary/80 transition-colors"
                                                    onClick={() => {
                                                        const url = new URL(window.location.origin + '/')
                                                        url.searchParams.set('page', '1')
                                                        url.searchParams.set('budget_document', slug)
                                                        window.open(url.toString(), '_blank')
                                                    }}
                                                >
                                                    {displayName}
                                                </Badge>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground">—</span>
                                )}
                            </MetadataItem>
                        </div>
                    </div>

                    {/* Subject Headings */}
                    {mandate.subject_headings && mandate.subject_headings.length > 0 && (
                        <div className="bg-white rounded-lg border p-6">
                            <h3 className="text-lg font-semibold mb-4">
                                <a href="https://metadata.un.org/thesaurus/" target="_blank" rel="noopener noreferrer" className="hover:underline">
                                    UN Library Subjects
                                </a>
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {mandate.subject_headings
                                    .slice()
                                    .sort((a, b) => a.localeCompare(b))
                                    .map((heading, index) => (
                                        <Badge
                                            key={index}
                                            variant="outline"
                                            className="!border-un-blue cursor-pointer hover:bg-un-blue/10 transition-colors"
                                            onClick={() => {
                                                const url = new URL(window.location.origin + '/')
                                                url.searchParams.set('page', '1')
                                                url.searchParams.set('subject', heading.trim())
                                                window.open(url.toString(), '_blank')
                                            }}
                                        >
                                            {titleCase(heading.toLowerCase())}
                                        </Badge>
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
