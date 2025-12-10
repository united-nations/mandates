'use client'

import { Suspense, useState } from 'react'
import { useParams } from 'next/navigation'
import { Landmark, Link as LinkIcon } from 'lucide-react'
import { MandateExplorer } from '@/components/MandateExplorer'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MetadataItem } from '@/components/MetadataItem'
import { formatUrlForDisplay } from '@/lib/utils'
import { LoadingFallback } from '@/components/LoadingFallback'

function OrganPageContent() {
  const params = useParams()
  const organName = decodeURIComponent(params.organ as string)

  const [organDetails, setOrganDetails] = useState<{
    short: string
    long: string
    website?: string
  } | null>(null)

  // Callback to receive organ details from MandateExplorer
  const handleOrganDetailsLoaded = (organs: any[]) => {
    const foundOrgan = organs.find((o: any) => o.short === organName)
    if (foundOrgan) {
      setOrganDetails(foundOrgan)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-4">
          {/* <div className="rounded-lg bg-un-blue/10 p-2 w-12 flex items-center justify-center">
            <Landmark className="h-6 w-6 text-un-blue" />
          </div> */}
          <h1 className="text-2xl font-bold tracking-tight">
            {organDetails?.long} ({organName})
          </h1>
        </div>

        {!organDetails ? (
          <div className="mt-4 ml-0 space-y-2">
            <Skeleton className="h-6 w-48" />
          </div>
        ) : (
          <div className="ml-0 space-y-0">
            {organDetails.website && (
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
            )}
          </div>
        )}
      </div>

      {/* Mandate Explorer - now passes callback to receive organ details */}
      <MandateExplorer
        pageType="organ"
        organFilter={organName}
        onOrganDetailsLoaded={handleOrganDetailsLoaded}
      />
    </div>
  )
}

export default function OrganPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OrganPageContent />
    </Suspense>
  )
}
