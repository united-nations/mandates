import { notFound } from 'next/navigation'
import { getMandateDisplayTitle, decodeUrlSegments } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'

import { getMandateBySymbol } from '@/lib/data/mandates'
import { getAllEntities } from '@/lib/data/entities'
import { getBudgetDocuments } from '@/lib/data/budget-documents'
import { getAllOrgans } from '@/lib/data/organs'
import { getParagraphsBySymbol } from '@/lib/data/paragraphs'
import { ParagraphsSection } from '@/components/ParagraphSection'
import { CitationCounts } from '@/components/CitationCounts'
import { MandateMetadata } from '@/components/MandateMetadata'
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

  const [mandate, entities, budgetDocuments, organs, paragraphs] =
    await Promise.all([
      getMandateBySymbol(documentSymbol, ppbVersion),
      getAllEntities(),
      getBudgetDocuments(),
      getAllOrgans(),
      getParagraphsBySymbol(documentSymbol),
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
      <div className="space-y-10 sm:pr-2">
        <MandateMetadata
          mandate={mandate}
          budgetDocuments={budgetDocuments}
          organs={organs}
        />
        <CitationCounts mandate={mandate} entities={entities} />
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
