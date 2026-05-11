import { Suspense } from 'react'
import { Link as LinkIcon } from 'lucide-react'
import { MandateExplorerServer } from '@/app/_mandateExplorerServer'
import { MetadataItem } from '@/components/MetadataItem'
import { formatUrlForDisplay } from '@/lib/utils'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { getMandatePageData } from '@/lib/data/mandates'
import { parseSearchParams } from '@/lib/filter-constants'
import { getOrganByShortName } from '@/lib/data/organs'

interface OrganPageProps {
  params: Promise<{ organ: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function OrganPage({
  params,
  searchParams,
}: OrganPageProps) {
  const { organ: organParam } = await params
  const organName = decodeURIComponent(organParam)

  const urlParams = await searchParams
  const filters = parseSearchParams({ ...urlParams, organ: organName })

  // Fetch organ details eagerly (needed for header), defer mandate data
  const organDetails = await getOrganByShortName(organName)

  // Start mandate fetch without awaiting — streams in via Suspense below
  const dataPromise = getMandatePageData(filters)

  return (
    <div>
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">
            {organDetails?.long || organName} ({organName})
          </h1>
        </div>

        {organDetails?.website && (
          <div className="ml-0 space-y-0">
            <MetadataItem label="Website" icon={LinkIcon}>
              <a
                href={organDetails.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-un-blue underline transition-colors hover:text-un-blue/80"
              >
                {formatUrlForDisplay(organDetails.website, 35)}
              </a>
            </MetadataItem>
          </div>
        )}
      </div>

      <Suspense fallback={<LoadingSkeleton variant="list" count={4} />}>
        <MandateExplorerServer
          dataPromise={dataPromise}
          pageType="organ"
          organFilter={organName}
        />
      </Suspense>
    </div>
  )
}
