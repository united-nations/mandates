import { Suspense } from 'react'

import { MandateExplorerServer } from '@/app/_mandateExplorerServer'
import { HeaderStatsServer } from '@/app/_headerStatsServer'
import { ExplainerText } from '@/components/ExplainerText'
import { HeaderStatsSkeleton } from '@/components/HeaderStats.skeleton'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { getMandatePageData } from '@/lib/data/mandates'
import { parseSearchParams } from '@/lib/filter-constants'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams
  const filters = parseSearchParams(params)

  // Start the fetch without awaiting — the Suspense boundary below streams
  // the skeleton immediately and replaces it when the data resolves.
  const dataPromise = getMandatePageData(filters)

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <ExplainerText />
        <div className="mt-1 shrink-0 sm:mt-4">
          <Suspense fallback={<HeaderStatsSkeleton />}>
            <HeaderStatsServer dataPromise={dataPromise} />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<LoadingSkeleton variant="list" count={4} />}>
        <MandateExplorerServer dataPromise={dataPromise} />
      </Suspense>
    </div>
  )
}
