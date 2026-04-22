import { Suspense } from 'react'
import { AlertCircle } from 'lucide-react'
import { MandateExplorerServer } from '@/app/_mandateExplorerServer'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { getMandatePageData } from '@/lib/data/mandates'
import { parseSearchParams } from '@/lib/filter-constants'
import { getEntityByCode } from '@/lib/data/entities'

interface EntityPageProps {
  params: Promise<{ entity: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function EntityPage({
  params,
  searchParams,
}: EntityPageProps) {
  const { entity: entityParam } = await params
  const entityName = decodeURIComponent(entityParam)

  const urlParams = await searchParams
  const filters = parseSearchParams({ ...urlParams, entity: entityName })

  // Fetch entity details eagerly (needed for header/alerts), defer mandate data
  const entityDetails = await getEntityByCode(entityName)
  const entityNotFound = !entityDetails

  // Start mandate fetch without awaiting — streams in via Suspense below
  const dataPromise = getMandatePageData(filters)

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

      {entityDetails && (
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight">
              {entityDetails.entity_long} ({entityName})
            </h1>
          </div>

          {/* <Button
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
          </Button> */}
        </div>
      )}

      {!entityNotFound && (
        <Suspense fallback={<LoadingSkeleton variant="list" count={4} />}>
          <MandateExplorerServer
            dataPromise={dataPromise}
            pageType="entity"
            entityFilter={entityName}
          />
        </Suspense>
      )}
    </div>
  )
}
