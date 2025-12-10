'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { getMandateDisplayTitle } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'

import { LoadingFallback } from '@/components/LoadingFallback'
import { decodeUrlSegments } from '@/lib/shared-utils'
import { useMandateData } from '@/hooks/use-mandate-data'
import { ParagraphsSection } from '@/components/ParagraphSection'
import { CitationCounts } from '@/components/CitationCounts'
import { MandateMetadata } from '@/components/MandateMetadata'
import { ScrollToTop } from '@/components/ScrollToTop'

function MandatePageContent() {
  const params = useParams()
  const segments = params.segments as string[]

  // Reconstruct the full document symbol from segments
  const documentSymbol = decodeUrlSegments(segments)

  // Use unified hook for mandate and paragraphs data
  const {
    mandate,
    paragraphs,
    entities,
    isLoading: loading,
    error,
  } = useMandateData({ documentSymbol })

  if (loading) {
    return (
      <div className="pb-8">
        <div className="mb-6">
          <div className="mb-2 h-8 w-64 animate-pulse rounded bg-gray-200" />
          <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="space-y-4">
          <div className="h-20 w-full animate-pulse rounded bg-gray-200" />
          <div className="h-40 w-full animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    )
  }

  if (error || !mandate) {
    return (
      <div className="pb-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-red-600">Mandate Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            Could not find mandate with document symbol:{' '}
            <code className="rounded bg-muted px-2 py-1">{documentSymbol}</code>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="mb-8 border-b pr-12 pb-2 md:pb-4">
        <p className="text-base font-medium text-muted-foreground md:text-lg">
          Mandate Document
        </p>
        <h1 className="mt-1 text-lg leading-tight font-bold md:text-2xl">
          {getMandateDisplayTitle(mandate)}
        </h1>
        <p className="mt-0.5 font-mono text-sm text-muted-foreground md:mt-1 md:text-base">
          {mandate.full_document_symbol}
        </p>
        {mandate.link ? (
          <Button
            asChild
            className="mt-1.5 h-7 bg-trout! text-xs text-white! transition-colors hover:bg-trout/90! md:mt-4 md:h-10 md:text-sm"
          >
            <a
              href={mandate.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 md:gap-2"
            >
              <FileText className="h-3 w-3 md:h-4 md:w-4" />
              View PDF
            </a>
          </Button>
        ) : (
          <Button
            disabled
            variant="default"
            className="mt-1.5 inline-flex h-7 items-center gap-1.5 bg-trout/50! text-xs text-white/70! md:mt-4 md:h-10 md:gap-2 md:text-sm"
          >
            <FileText className="h-3 w-3 md:h-4 md:w-4" />
            View PDF
          </Button>
        )}
      </div>

      {/* Content */}
      <div>
        <div className="space-y-10 sm:pr-2">
          {/* Metadata Section */}
          <MandateMetadata mandate={mandate} />

          {/* Citations Section */}
          <CitationCounts mandate={mandate} entities={entities} />

          {/* Paragraphs Section with TOC */}
          <ParagraphsSection
            paragraphs={paragraphs}
            documentSymbol={documentSymbol}
            isLoading={loading}
            error={error}
          />
        </div>
      </div>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  )
}

export default function MandatePage() {
  return (
    <Suspense fallback={<LoadingFallback variant="mandate" />}>
      <MandatePageContent />
    </Suspense>
  )
}
