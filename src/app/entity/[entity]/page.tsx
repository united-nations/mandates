'use client'

import { Suspense, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Building, Link as LinkIcon, Landmark, ExternalLink, AlertCircle } from 'lucide-react'
import { EntityName } from '@/components/ui/entity-name'
import { MandateExplorer } from '@/components/mandate-explorer'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MetadataItem } from '@/components/ui/metadata-item'
import { formatUrlForDisplay } from '@/lib/utils'
import { LoadingFallback } from '@/components/ui/loading-fallback'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

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

    // Callback to receive entity details from MandateExplorer (more efficient)
    const handleEntityDetailsLoaded = (entities: Entity[]) => {
        const foundEntity = entities.find(e => e.entity === entityName)
        if (foundEntity) {
            setEntityDetails(foundEntity)
            setEntityNotFound(false)
        } else {
            setEntityNotFound(true)
        }
        setIsLoading(false)
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
                        The entity "{entityName}" does not exist or has not yet been added to the UN Mandate Source Registry.
                    </AlertDescription>
                </Alert>
            )}

            <div className='mb-8'>
                <div className='flex items-center gap-4 mb-4'>
                    {entityDetails ? (
                        <h1 className='text-2xl font-bold tracking-tight'>
                            {entityDetails.entity_long} ({entityName})
                        </h1>
                    ) : isLoading ? (
                        <div className='space-y-2'>
                            <Skeleton className='h-8 w-96' />
                        </div>
                    ) : null}
                </div>

                {entityDetails && (
                    <Button
                        size='sm'
                        asChild
                        className='bg-un-blue text-white hover:bg-un-blue/90 transition-colors'
                    >
                        <a
                            href={`https://systemchart.un.org/?entity=${entityName.toLowerCase()}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='flex items-center gap-2'
                        >
                            <ExternalLink className='h-4 w-4' />
                            View in UN System Chart
                        </a>
                    </Button>
                )}
            </div>

            {/* Only show Mandate Explorer if entity exists or we're still loading */}
            {!entityNotFound && (
                <MandateExplorer
                    pageType='entity'
                    entityFilter={entityName}
                    onEntityDetailsLoaded={handleEntityDetailsLoaded}
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
