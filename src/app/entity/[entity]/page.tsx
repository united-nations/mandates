'use client'

import { Suspense, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Building,
  Link as LinkIcon,
  Landmark,
  ExternalLink,
  AlertCircle,
  Info,
} from 'lucide-react'
import { EntityName } from '@/components/EntityName'
import { MandateExplorer } from '@/components/MandateExplorer'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MetadataItem } from '@/components/MetadataItem'
import { formatUrlForDisplay } from '@/lib/utils'
import { LoadingFallback } from '@/components/LoadingFallback'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { ApiResponse } from '@/types'

interface Entity {
  entity: string
  entity_long: string
  entity_link?: string
  transparency_portal_link?: string
  entity_description?: string
}

function EntityPageContent() {
  const params = useParams()
  const entityName = decodeURIComponent(params.entity as string)

  const [entityDetails, setEntityDetails] = useState<Entity | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [entityNotFound, setEntityNotFound] = useState(false)
  const [mandateCount, setMandateCount] = useState<number | null>(null)

  // Callback to receive entity details from MandateExplorer (more efficient)
  const handleEntityDetailsLoaded = (entities: Entity[]) => {
    const foundEntity = entities.find((e) => e.entity === entityName)
    if (foundEntity) {
      setEntityDetails(foundEntity)
      setEntityNotFound(false)
    } else {
      setEntityNotFound(true)
    }
    setIsLoading(false)
  }

  // Callback to receive API data including mandate count
  const handleDataLoaded = (data: ApiResponse) => {
    setMandateCount(data.pagination.totalItems)
  }

  // Set a timeout to show error if no data is loaded within reasonable time
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!entityDetails && isLoading) {
        setIsLoading(false)
      }
    }, 3000) // 3 seconds timeout

    return () => clearTimeout(timer)
  }, [entityDetails, isLoading])

  return (
    <div>
      {/* Show error if entity not found after loading */}
      {!isLoading && entityNotFound && (
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
      {!isLoading && entityDetails && mandateCount === 0 && (
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

      <div className="mb-8">
        <div className="mb-4 flex items-center gap-4">
          {entityDetails ? (
            <h1 className="text-2xl font-bold tracking-tight">
              {entityDetails.entity_long} ({entityName})
            </h1>
          ) : isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-96" />
            </div>
          ) : null}
        </div>

        {entityDetails && (
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
        )}
      </div>

      {/* Only show Mandate Explorer if entity exists or we're still loading */}
      {!entityNotFound && (
        <MandateExplorer
          pageType="entity"
          entityFilter={entityName}
          onEntityDetailsLoaded={handleEntityDetailsLoaded}
          onDataLoaded={handleDataLoaded}
        />
      )}
    </div>
  )
}

export default function EntityPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <EntityPageContent />
    </Suspense>
  )
}
