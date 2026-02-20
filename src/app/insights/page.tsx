import { Suspense } from 'react'
import type { Metadata } from 'next'

import { InsightsTable } from '@/components/InsightsTable'
import { getInsightsData } from '@/lib/data/insights'
import type { InsightFilters } from '@/lib/data/insights'

export const metadata: Metadata = {
  title: 'Document Insights — UN Mandate Registry',
  description:
    'Explore document statistics including word count, recurrence patterns, and textual similarity across UN documents.',
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function parseInsightParams(
  raw: Record<string, string | string[] | undefined>
): InsightFilters {
  const str = (key: string): string | undefined => {
    const v = raw[key]
    return Array.isArray(v) ? v[0] : v || undefined
  }

  return {
    keyword: str('keyword'),
    organ: str('organ'),
    start_year: str('start_year'),
    end_year: str('end_year'),
    recurrence: str('recurrence'),
    sort_by: str('sort_by') || undefined,
    page: str('page') || '1',
    limit: str('limit') || '25',
  }
}

export default async function InsightsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const filters = parseInsightParams(params)
  const data = await getInsightsData(filters)

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Document Insights</h1>
        {/* <p className="text-muted-foreground mt-1">
          Resolution statistics — word count, recurrence patterns, and textual similarity
          across {data.pagination.totalItems.toLocaleString()} UN documents.
        </p> */}
      </div>

      {/* Table */}
      <Suspense
        fallback={
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            Loading insights…
          </div>
        }
      >
        <InsightsTable data={data} />
      </Suspense>
    </div>
  )
}
