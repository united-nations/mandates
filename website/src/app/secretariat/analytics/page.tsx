import type { Metadata } from 'next'

import { AnalyticsTabs } from '@/components/AnalyticsTabs'
import { MandateLandscape } from '@/components/MandateLandscape'
import { getMandateLandscape } from '@/lib/data/mandate-landscape'
import { CoCitationHeatmap } from '@/components/CoCitationHeatmap'
import { MandatingBodyEntityHeatmap } from '@/components/MandatingBodyEntityHeatmap'
import { LatestRecordedTrend } from '@/components/LatestRecordedTrend'
import { ReviewScopeExplorer } from '@/components/ReviewScopeExplorer'
import { getBudgetVersions } from '@/lib/data/budget-documents'
import { HistoricalDocumentTrend } from '@/components/HistoricalDocumentTrend'
import { SecurityCouncilResolutionTrend } from '@/components/SecurityCouncilResolutionTrend'
import { ResolutionCitationTrend } from '@/components/ResolutionCitationTrend'
import { ResolutionRecurrenceTrend } from '@/components/ResolutionRecurrenceTrend'
import { TopicTrends } from '@/components/TopicTrends'
import {
  getEntityCoCitationMatrix,
  getOrganEntityMatrix,
  getResolutionCitationTrend,
  getResolutionRecurrenceTrend,
  getSecurityCouncilResolutionTrend,
  getReviewScopeGroups,
  getLatestRecordedTrend,
  getTopicTrends,
} from '@/lib/data/mandates'
import { parseSearchParams } from '@/lib/filter-constants'
import { explainerTexts } from '@/lib/en_text_contents'

export const metadata: Metadata = {
  title: 'Mandate Analytics',
  description:
    'Charts of the UN Secretariat mandate registry — trends over time and citation relationships between mandating bodies, entities, and topics.',
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function Chart({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 md:p-6">
      <h2
        className={`text-base font-semibold text-foreground ${description ? '' : 'mb-4'}`}
      >
        {title}
      </h2>
      {description && (
        <p className="mt-1 mb-4 max-w-3xl text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {children}
    </div>
  )
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const filters = parseSearchParams(await searchParams)

  const [
    resolutionTrend,
    recurrenceTrend,
    latestRecordedTrend,
    securityCouncilTrend,
    reviewScopeGroups,
    landscapeGroups,
    budgetVersions,
    topicTrends,
    coCitationMatrix,
    organEntityMatrix,
  ] = await Promise.all([
    getResolutionCitationTrend(filters.ppb_version),
    getResolutionRecurrenceTrend(filters.ppb_version),
    getLatestRecordedTrend(filters.ppb_version),
    getSecurityCouncilResolutionTrend(filters.ppb_version),
    getReviewScopeGroups(filters.ppb_version),
    getMandateLandscape(filters.ppb_version),
    getBudgetVersions(),
    getTopicTrends(),
    getEntityCoCitationMatrix(filters.ppb_version),
    getOrganEntityMatrix(filters.ppb_version),
  ])

  const selectedVersion = budgetVersions.find((version) =>
    filters.ppb_version
      ? version.slug === filters.ppb_version
      : version.is_default
  )

  const overTime = (
    <>
      <Chart title={explainerTexts.documentTrend.heading}>
        <HistoricalDocumentTrend
          data={resolutionTrend}
          currentYear={new Date().getUTCFullYear()}
        />
      </Chart>
      <Chart title={explainerTexts.trendComposition.recurrenceHeading}>
        <ResolutionRecurrenceTrend data={recurrenceTrend} />
      </Chart>
      <Chart title={explainerTexts.latestRecordedTrend.heading}>
        <LatestRecordedTrend data={latestRecordedTrend} />
      </Chart>
      <Chart
        title="Resolutions and cited mandates"
        description="Resolutions adopted each year against the subset cited as mandate sources in the proposed UN programme budget."
      >
        <ResolutionCitationTrend data={resolutionTrend} />
      </Chart>
      <Chart title={explainerTexts.securityCouncilTrend.heading}>
        <SecurityCouncilResolutionTrend data={securityCouncilTrend} />
      </Chart>
      <Chart title={explainerTexts.reviewScope.heading}>
        <ReviewScopeExplorer
          groups={reviewScopeGroups}
          currentYear={new Date().getUTCFullYear()}
          versionLabel={
            (selectedVersion
              ? explainerTexts.reviewScope.versionLabel.replace(
                  '{year}',
                  String(selectedVersion.ppb_year)
                )
              : undefined) ??
            filters.ppb_version ??
            explainerTexts.reviewScope.defaultVersion
          }
        />
      </Chart>
      <Chart title={explainerTexts.mandateLandscape.heading}>
        <MandateLandscape
          groups={landscapeGroups}
          currentYear={new Date().getUTCFullYear()}
          versionLabel={
            selectedVersion?.slug ??
            filters.ppb_version ??
            explainerTexts.reviewScope.defaultVersion
          }
        />
      </Chart>
    </>
  )

  const topics = (
    <Chart
      title="Topic trends"
      description="How the mix of subjects applied to mandate documents has shifted over time. Click a subject to see its mandates in the main table."
    >
      <TopicTrends years={topicTrends} />
    </Chart>
  )

  const relationships = (
    <>
      <Chart
        title="Co-citations between entities"
        description="Which entities cite the same mandate sources — a proxy for shared mandates and overlapping work. Click a cell to see the shared documents in the main table."
      >
        <CoCitationHeatmap matrix={coCitationMatrix} />
      </Chart>
      <Chart
        title="Citation patterns between entities and mandating bodies"
        description="Which mandating bodies each entity draws its mandates from. Click a cell to see those documents in the main table."
      >
        <MandatingBodyEntityHeatmap matrix={organEntityMatrix} />
      </Chart>
    </>
  )

  return (
    <section className="mx-auto max-w-6xl px-2 pt-4 pb-10 sm:px-6 md:px-12 lg:px-16">
      <AnalyticsTabs
        overTime={overTime}
        relationships={relationships}
        topics={topics}
      />
    </section>
  )
}
