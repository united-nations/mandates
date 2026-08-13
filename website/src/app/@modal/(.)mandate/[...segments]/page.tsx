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
import { getCountryVotes } from '@/lib/data/country-votes'
import { getVoteInfo } from '@/lib/data/votes'
import { ParagraphsSection } from '@/components/ParagraphsSection'
import { CitationCounts } from '@/components/CitationCounts'
import { MandateDetailHeader } from '@/components/MandateDetailUi'
import { MandateMetadata } from '@/components/MandateMetadata'
import { MandateSgReports } from '@/components/MandateSgReports'
import { MandateTopics } from '@/components/MandateTopics'
import { MandateVersionHistory } from '@/components/MandateVersionHistory'
import { MandateImplementationChips } from '@/components/MandateImplementationChips'
import { MandateVoteStrip } from '@/components/MandateVoteStrip'

interface ModalMandatePageProps {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
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

  const [
    mandate,
    entities,
    organs,
    paragraphs,
    series,
    related,
    sgReports,
    voteInfo,
  ] = await Promise.all([
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
    getVoteInfo(documentSymbol),
  ])

  if (!mandate) notFound()

  return (
    <div className="pb-12">
      <MandateDetailHeader
        title={getMandateDisplayTitle(mandate)}
        symbol={mandate.full_document_symbol}
        link={mandate.link}
        className="mb-8"
      />

      {/* Content — keep in step with app/mandate/[...segments]/page.tsx. */}
      <div className="space-y-6 sm:pr-2">
        {/* Implementation chips and the vote strip come from the analytics
            lenses: what this mandate turned into on the ground, and how the
            organ split when it adopted the text. */}
        <MandateImplementationChips symbol={mandate.full_document_symbol} />
        <MandateVoteStrip
          vote={voteInfo}
          countries={getCountryVotes(documentSymbol)}
        />
        <MandateMetadata mandate={mandate} organs={organs} />
        {series && (
          <MandateVersionHistory
            currentSymbol={mandate.full_document_symbol}
            series={series}
          />
        )}
        {/* The reports lens carried its own MandateReportsSection here. It is
            dropped in favour of MandateSgReports, which answers the same
            question ("which reports came back under this mandate?") from the
            Digital Library catalogue rather than a static JSON snapshot. */}
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
          compact
          entities={entities}
        />
      </div>
    </div>
  )
}
