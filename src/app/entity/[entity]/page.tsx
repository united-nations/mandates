'use client'

import { Suspense, useState } from 'react'
import { useParams } from 'next/navigation'
import { Building, Link as LinkIcon, Landmark, ExternalLink } from 'lucide-react'
import { EntityName } from '@/components/ui/entity-name'
import { MandateExplorer } from '@/components/mandate-explorer'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MetadataItem } from '@/components/ui/metadata-item'
import { formatUrlForDisplay } from '@/lib/utils'
import { LoadingFallback } from '@/components/ui/loading-fallback'
import { Button } from '@/components/ui/button'

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

    // Callback to receive entity details from MandateExplorer (more efficient)
    const handleEntityDetailsLoaded = (entities: Entity[]) => {
        const foundEntity = entities.find(e => e.entity === entityName)
        if (foundEntity) {
            setEntityDetails(foundEntity)
        }
    }

    return (
        <div>
            <div className='mb-8'>
                <div className='flex items-center gap-4 mb-4'>
                    {entityDetails ? (
                        <h1 className='text-2xl font-bold tracking-tight'>
                            {entityDetails.entity_long} ({entityName})
                        </h1>
                    ) : (
                        <div className='space-y-2'>
                            <Skeleton className='h-8 w-96' />
                        </div>
                    )}
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

            {/* Mandate Explorer */}
            <MandateExplorer
                pageType='entity'
                entityFilter={entityName}
                onEntityDetailsLoaded={handleEntityDetailsLoaded}
            />
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
