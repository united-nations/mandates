import { notFound } from 'next/navigation'
import { getMandateDisplayTitle, decodeUrlSegments } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'

import { getMandateBySymbol, getResolutionSeries } from '@/lib/data/mandates'
import { getAllEntities } from '@/lib/data/entities'
import { getRelatedMandates, getSubjectDomainCodes } from '@/lib/data/related'
import { SHOW_RELATED_MANDATES } from '@/lib/feature-flags'
import { getAllOrgans } from '@/lib/data/organs'
import { getParagraphsBySymbol } from '@/lib/data/paragraphs'
import { ParagraphsSection } from '@/components/ParagraphsSection'
import { CitationCounts } from '@/components/CitationCounts'
import { MandateMetadata } from '@/components/MandateMetadata'
import { MandateTopics } from '@/components/MandateTopics'
import { MandateVersionHistory } from '@/components/MandateVersionHistory'
import { ScrollToTop } from '@/components/ScrollToTop'

interface MandatePageProps {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function MandatePage({
  params,
  searchParams,
}: MandatePageProps) {
  const { segments } = await params
  const documentSymbol = decodeUrlSegments(segments)
  const sp = await searchParams
  const ppbVersion =
    typeof sp.ppb_version === 'string' ? sp.ppb_version : undefined

  const [mandate, entities, organs, paragraphs, series, related, domainCodes] =
    await Promise.all([
      getMandateBySymbol(documentSymbol, ppbVersion),
      getAllEntities(),
      getAllOrgans(),
      getParagraphsBySymbol(documentSymbol),
      getResolutionSeries(documentSymbol),
      // Skipped entirely while the section is flagged off, so the detail page
      // does not pay for the query.
      SHOW_RELATED_MANDATES ? getRelatedMandates(documentSymbol) : [],
      getSubjectDomainCodes(documentSymbol),
    ])

  if (!mandate) notFound()

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="mb-8 border-b pr-12 pb-2 md:pb-4">
        {/* No back button here: the global BackButton in RootLayoutClient
            already renders on /mandate/* (non-home pages). */}
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
      <div className="space-y-6 sm:pr-2">
        <MandateMetadata mandate={mandate} organs={organs} />
        {series && (
          <MandateVersionHistory
            currentSymbol={mandate.full_document_symbol}
            series={series}
          />
        )}
        <CitationCounts mandate={mandate} entities={entities} />
        <MandateTopics
          subjects={mandate.subject_headings ?? []}
          domainCodes={domainCodes}
          related={related}
        />
        <ParagraphsSection
          paragraphs={paragraphs}
          documentSymbol={documentSymbol}
          isLoading={false}
          error={null}
          entities={entities}
        />
      </div>

      <ScrollToTop />
    </div>
  )
}
