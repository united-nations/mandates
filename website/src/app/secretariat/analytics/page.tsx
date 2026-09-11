import type { Metadata } from 'next'

import { AnalyticsTabs } from '@/components/AnalyticsTabs'
import { CoCitationHeatmap } from '@/components/CoCitationHeatmap'
import { MandatingBodyEntityHeatmap } from '@/components/MandatingBodyEntityHeatmap'
import { ResolutionCitationTrend } from '@/components/ResolutionCitationTrend'
import { ResolutionRecurrenceTrend } from '@/components/ResolutionRecurrenceTrend'
import { TopicTrends } from '@/components/TopicTrends'
import {
  getEntityCoCitationMatrix,
  getOrganEntityMatrix,
  getResolutionCitationTrend,
  getResolutionRecurrenceTrend,
  getTopicTrends,
} from '@/lib/data/mandates'
import { parseSearchParams } from '@/lib/filter-constants'

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
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 mb-4 max-w-3xl text-sm text-gray-500">{description}</p>
      {children}
    </div>
  )
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const filters = parseSearchParams(await searchParams)

  const [
    resolutionTrend,
    recurrenceTrend,
    topicTrends,
    coCitationMatrix,
    organEntityMatrix,
  ] = await Promise.all([
    getResolutionCitationTrend(filters.ppb_version),
    getResolutionRecurrenceTrend(filters.ppb_version),
    getTopicTrends(),
    getEntityCoCitationMatrix(filters.ppb_version),
    getOrganEntityMatrix(filters.ppb_version),
  ])

  const overTime = (
    <>
      <Chart
        title="Resolutions and cited mandates"
        description="Resolutions adopted each year against the subset cited as mandate sources in the proposed UN programme budget."
      >
        <ResolutionCitationTrend data={resolutionTrend} />
      </Chart>
      <Chart
        title="Genuinely new resolutions"
        description="Resolutions each year that start a new series, rather than recurring versions of an earlier text."
      >
        <ResolutionRecurrenceTrend data={recurrenceTrend} />
      </Chart>
      <Chart
        title="Topic trends"
        description="How the mix of subjects applied to mandate documents has shifted over time. Click a subject to see its mandates in the main table."
      >
        <TopicTrends years={topicTrends} />
      </Chart>
    </>
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
    <div className="pb-16">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Mandate analytics
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-gray-600">
          Charts drawn from the mandate registry: how citations and resolutions
          move over time, and how mandating bodies, entities, and topics relate
          to one another. Click any item to open the main table filtered to it.
        </p>
      </header>

      <AnalyticsTabs overTime={overTime} relationships={relationships} />
    </div>
  )
}
