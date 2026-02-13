import { Suspense } from 'react'
import {
  ExternalLink,
  AlertCircle,
  Info,
} from 'lucide-react'
import { MandateExplorerClient } from '@/components/MandateExplorerClient'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { getMandatePageData, parseSearchParams } from '@/lib/data-fetcher'
import { getEntityByCode } from '@/lib/db/entities'

interface EntityPageProps {
  params: Promise<{ entity: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function EntityPage({ params, searchParams }: EntityPageProps) {
  const { entity: entityParam } = await params
  const entityName = decodeURIComponent(entityParam)
  
  const urlParams = await searchParams
  const filters = parseSearchParams({ ...urlParams, entity: entityName })
  
  // Fetch entity details and mandate data in parallel
  const [entityDetails, data] = await Promise.all([
    getEntityByCode(entityName),
    getMandatePageData(filters),
  ])

  const entityNotFound = !entityDetails
  const mandateCount = data.pagination.totalItems

  return (
    <div>
      {/* Show error if entity not found */}
      {entityNotFound && (
        <Alert variant="destructive" className="mb-6 max-w-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Entity Not Found</AlertTitle>
          <AlertDescription>
            The entity "{entityName}" does not exist or has not yet been added
            to the UN Mandate Source Registry.
          </AlertDescription>
        </Alert>
      )}

      {/* Show info message if entity exists but has no mandates */}
      {entityDetails && mandateCount === 0 && (
        <Alert className="mb-6 max-w-2xl border-un-blue/30 bg-un-blue/5 text-un-blue">
          <Info className="h-4 w-4" />
          <AlertTitle>Source Documents Not Yet Available</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>
                No source documents have been found for{' '}
                {entityDetails.entity_long} ({entityName}) in the current
                version of the registry. Documents for this entity are being
                processed and will be added soon.
              </p>
              <p className="font-medium">
                Are you an entity focal point?{' '}
                <a
                  href="https://airtable.com/appId4rDWaFTpzNWz/pagpU0nMIhQMQPICL/form"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  Please get in touch
                </a>{' '}
                to expedite this process.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {entityDetails && (
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight">
              {entityDetails.entity_long} ({entityName})
            </h1>
          </div>

          <Button
            size="sm"
            asChild
            className="bg-un-blue text-white transition-colors hover:bg-un-blue/90"
          >
            <a
              href={`https://systemchart.un.org/?entity=${entityName.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View in UN System Chart
            </a>
          </Button>
        </div>
      )}

      {/* Only show Mandate Explorer if entity exists */}
      {!entityNotFound && (
        <Suspense fallback={<LoadingSkeleton variant="list" count={4} />}>
          <MandateExplorerClient
            data={data}
            pageType="entity"
            entityFilter={entityName}
          />
        </Suspense>
      )}
    </div>
  )
}
