import { Suspense } from 'react'

import { ExplainerText } from '@/components/ExplainerText'
import { MandateExplorerServer } from '@/app/_mandateExplorerServer'
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
      <ExplainerText />

      <Suspense fallback={<LoadingSkeleton variant="list" count={4} />}>
        <MandateExplorerServer dataPromise={dataPromise} />
      </Suspense>
    </div>
  )
}
