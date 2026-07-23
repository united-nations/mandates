import type { Metadata } from 'next'

import { CoCitationHeatmap } from '@/components/CoCitationHeatmap'
import { OrganEntityHeatmap } from '@/components/OrganEntityHeatmap'
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
    'Charts of the UN Secretariat mandate registry — trends over time and citation relationships between organs, entities, and topics.',
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
    getResolutionRecurrenceTrend(),
    getTopicTrends(),
    getEntityCoCitationMatrix(filters.ppb_version),
    getOrganEntityMatrix(filters.ppb_version),
  ])

  return (
    <div className="space-y-12 pb-16">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Mandate analytics
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-gray-600">
          Charts drawn from the mandate registry: how citations and resolutions
          move over time, and how organs, entities, and topics relate to one
          another.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-gray-900">
          Over time
        </h2>
        <div className="space-y-4">
          <Chart
            title="Resolutions and cited mandates"
            description="Resolutions adopted each year against the subset cited as mandate sources in the proposed programme budget."
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
            description="How the mix of subjects applied to mandate documents has shifted over time."
          >
            <TopicTrends years={topicTrends} />
          </Chart>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-gray-900">
          Relationships
        </h2>
        <div className="space-y-4">
          <Chart
            title="Co-citations between entities"
            description="Which entities cite the same mandate sources — a proxy for shared mandates and overlapping work."
          >
            <CoCitationHeatmap matrix={coCitationMatrix} />
          </Chart>
          <Chart
            title="Citation patterns between entities and organs"
            description="Which intergovernmental organs each entity draws its mandates from."
          >
            <OrganEntityHeatmap matrix={organEntityMatrix} />
          </Chart>
        </div>
      </section>
    </div>
  )
}
