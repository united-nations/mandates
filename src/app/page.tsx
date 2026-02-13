import { Suspense } from 'react'

import { ExplainerText } from '@/components/ExplainerText'
import { MandateExplorerClient } from '@/components/MandateExplorerClient'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { getMandatePageData, parseSearchParams } from '@/lib/data-fetcher'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams
  const filters = parseSearchParams(params)
  const data = await getMandatePageData(filters)

  return (
    <div className="space-y-6 pb-16">
      {/* Header with context info */}
      <ExplainerText />

      {/* Mandate Explorer with server-fetched data */}
      <Suspense fallback={<LoadingSkeleton variant="list" count={4} />}>
        <MandateExplorerClient data={data} pageType="main" />
      </Suspense>
    </div>
  )
}
