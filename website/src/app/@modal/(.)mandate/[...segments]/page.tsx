import { Suspense } from 'react'
import type { Metadata } from 'next'
import { explainerTexts } from '@/lib/en_text_contents'
import { notFound } from 'next/navigation'
import { decodeUrlSegments } from '@/lib/utils'

import { getMandateBySymbol, getResolutionSeries } from '@/lib/data/mandates'
import { getAllEntities } from '@/lib/data/entities'
import { getRelatedMandates } from '@/lib/data/related'
import { getMandatedSgReports } from '@/lib/data/mandated-sg-reports'
import {
  SHOW_MANDATED_SG_REPORTS,
  SHOW_RELATED_MANDATES,
} from '@/lib/feature-flags'
import { getAllOrgans } from '@/lib/data/organs'
import { getParagraphsBySymbol } from '@/lib/data/paragraphs'
import { getImplementationEvidenceCase } from '@/lib/data/implementation-evidence'
import { ParagraphsSection } from '@/components/ParagraphsSection'
import { CitationCounts } from '@/components/CitationCounts'
import { CitationCountsWithExpenditure } from '@/components/CitationCountsWithExpenditure'
import { detailSectionListClassName } from '@/components/MandateDetailUi'
import { MandateMetadata } from '@/components/MandateMetadata'
import { MandatedSgReportsBlock } from '@/components/MandatedSgReportsBlock'
import { MandateTopics } from '@/components/MandateTopics'
import { MandateVersionHistory } from '@/components/MandateVersionHistory'

interface ModalMandatePageProps {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({
  params,
}: Pick<ModalMandatePageProps, 'params'>): Promise<Metadata> {
  const { segments } = await params
  return {
    title: explainerTexts.pageTitles.mandate.replace(
      '{symbol}',
      decodeUrlSegments(segments)
    ),
  }
}

export default async function ModalMandatePage({
  params,
  searchParams,
}: ModalMandatePageProps) {
  const { segments } = await params
  const documentSymbol = decodeUrlSegments(segments)
  const sp = await searchParams
  const ppbVersion =
    typeof sp.ppb_version === 'string' ? sp.ppb_version : undefined

  const [mandate, entities, organs, series, related, sgReports] =
    await Promise.all([
      getMandateBySymbol(documentSymbol, ppbVersion),
      getAllEntities(),
      getAllOrgans(),
      getResolutionSeries(documentSymbol),
      // Flagged-off sections are skipped entirely, so the detail page does not
      // pay for their queries.
      SHOW_RELATED_MANDATES ? getRelatedMandates(documentSymbol) : [],
      SHOW_MANDATED_SG_REPORTS ? getMandatedSgReports(documentSymbol) : null,
    ])

  if (!mandate) notFound()

  return (
    // The record's name, symbol and source link are in the sheet header, so
    // the body starts straight into the content. Repeating them here cost a
    // screen-height and pushed the first answer below the fold.
    <div className="pb-12">
      {/* Same section rhythm as the full page — see detailSectionListClassName's
          doc for why this is a shared constant and not its own tuning. */}
      <div className={detailSectionListClassName}>
        <MandateMetadata mandate={mandate} organs={organs} />
        {series && (
          <MandateVersionHistory
            currentSymbol={mandate.full_document_symbol}
            series={series}
          />
        )}
        <Suspense
          fallback={
            <CitationCounts
              mandate={mandate}
              entities={entities}
              budgetVersion={ppbVersion}
            />
          }
        >
          <CitationCountsWithExpenditure
            mandate={mandate}
            entities={entities}
            budgetVersion={ppbVersion}
          />
        </Suspense>
        {sgReports && <MandatedSgReportsBlock block={sgReports} />}
        <MandateTopics
          subjects={mandate.subject_headings ?? []}
          related={related}
        />
        {/* The document's own text is the expensive part and the last thing
            read, so it must not hold up the four answers above it. Streaming
            it lets everything else paint immediately; the section renders its
            own skeleton until the paragraphs arrive. */}
        <Suspense
          fallback={
            <ParagraphsSection
              paragraphs={[]}
              documentSymbol={documentSymbol}
              isLoading
              error={null}
              compact
              entities={entities}
            />
          }
        >
          <MandateParagraphs
            sourceUrl={mandate.link}
            documentSymbol={documentSymbol}
            entities={entities}
          />
        </Suspense>
      </div>
    </div>
  )
}

/**
 * The paragraphs, fetched off the critical path.
 *
 * Kept as its own async component so React can stream it: the surrounding page
 * resolves without it and this boundary fills in when the query returns.
 */
async function MandateParagraphs({
  sourceUrl,
  documentSymbol,
  entities,
}: {
  sourceUrl?: string | null
  documentSymbol: string
  entities: Awaited<ReturnType<typeof getAllEntities>>
}) {
  const paragraphs = await getParagraphsBySymbol(documentSymbol)
  return (
    <ParagraphsSection
      implementationEvidence={getImplementationEvidenceCase(documentSymbol)}
      paragraphs={paragraphs}
      sourceUrl={sourceUrl}
      documentSymbol={documentSymbol}
      isLoading={false}
      error={null}
      compact
      entities={entities}
    />
  )
}
