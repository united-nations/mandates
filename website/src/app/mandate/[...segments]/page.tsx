import { Suspense } from 'react'
import type { Metadata } from 'next'
import { explainerTexts } from '@/lib/en_text_contents'
import { notFound } from 'next/navigation'
import { getMandateDisplayTitle, decodeUrlSegments } from '@/lib/utils'

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
import { MandateImplementationEvidence } from '@/components/MandateImplementationEvidence'
import { CitationCounts } from '@/components/CitationCounts'
import { CitationCountsWithExpenditure } from '@/components/CitationCountsWithExpenditure'
import {
  detailSectionListClassName,
  MandateDetailHeader,
} from '@/components/MandateDetailUi'
import { MandateMetadata } from '@/components/MandateMetadata'
import { MandatedSgReportsBlock } from '@/components/MandatedSgReportsBlock'
import { MandateTopics } from '@/components/MandateTopics'
import { MandateVersionHistory } from '@/components/MandateVersionHistory'
import { ScrollToTop } from '@/components/ScrollToTop'

interface MandatePageProps {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({
  params,
}: Pick<MandatePageProps, 'params'>): Promise<Metadata> {
  const { segments } = await params
  return {
    title: explainerTexts.pageTitles.mandate.replace(
      '{symbol}',
      decodeUrlSegments(segments)
    ),
  }
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

  const [mandate, entities, organs, paragraphs, series, related, sgReports] =
    await Promise.all([
      getMandateBySymbol(documentSymbol, ppbVersion),
      getAllEntities(),
      getAllOrgans(),
      getParagraphsBySymbol(documentSymbol),
      getResolutionSeries(documentSymbol),
      // Flagged-off sections are skipped entirely, so the detail page does not
      // pay for their queries.
      SHOW_RELATED_MANDATES ? getRelatedMandates(documentSymbol) : [],
      SHOW_MANDATED_SG_REPORTS ? getMandatedSgReports(documentSymbol) : null,
    ])

  if (!mandate) notFound()
  const implementationEvidence = getImplementationEvidenceCase(documentSymbol)

  return (
    <div className="pb-12">
      <MandateDetailHeader
        title={getMandateDisplayTitle(mandate)}
        symbol={mandate.full_document_symbol}
        link={mandate.link}
        className="mb-8 pr-12"
      />

      {/* Same section rhythm as the modal — see detailSectionListClassName's
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
        <MandateImplementationEvidence
          evidence={implementationEvidence}
          paragraphs={paragraphs}
        />
        <ParagraphsSection
          implementationEvidence={implementationEvidence}
          standalone
          paragraphs={paragraphs}
          sourceUrl={mandate.link}
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
