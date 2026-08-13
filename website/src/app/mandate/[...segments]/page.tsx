import { notFound } from 'next/navigation'
import { getMandateDisplayTitle, decodeUrlSegments } from '@/lib/utils'

import { getMandateBySymbol, getResolutionSeries } from '@/lib/data/mandates'
import { getAllEntities } from '@/lib/data/entities'
import { getRelatedMandates } from '@/lib/data/related'
import { getSgReportsMandatedByResolution } from '@/lib/data/sg-report-links'
import {
  SHOW_MANDATED_SG_REPORTS,
  SHOW_RELATED_MANDATES,
} from '@/lib/feature-flags'
import { getAllOrgans } from '@/lib/data/organs'
import { getParagraphsBySymbol } from '@/lib/data/paragraphs'
import { ParagraphsSection } from '@/components/ParagraphsSection'
import { CitationCounts } from '@/components/CitationCounts'
import { MandateDetailHeader } from '@/components/MandateDetailUi'
import { MandateMetadata } from '@/components/MandateMetadata'
import { MandateSgReports } from '@/components/MandateSgReports'
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
      SHOW_MANDATED_SG_REPORTS
        ? getSgReportsMandatedByResolution(documentSymbol)
        : [],
    ])

  if (!mandate) notFound()

  return (
    <div className="pb-12">
      <MandateDetailHeader
        title={getMandateDisplayTitle(mandate)}
        symbol={mandate.full_document_symbol}
        link={mandate.link}
        className="mb-8 pr-12"
      />

      {/* Content */}
      <div className="space-y-6 sm:pr-2">
        <MandateMetadata mandate={mandate} organs={organs} />
        {series && (
          <MandateVersionHistory
            currentSymbol={mandate.full_document_symbol}
            series={series}
          />
        )}
        {SHOW_MANDATED_SG_REPORTS && <MandateSgReports reports={sgReports} />}
        <CitationCounts mandate={mandate} entities={entities} />
        <MandateTopics
          subjects={mandate.subject_headings ?? []}
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
