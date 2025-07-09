'use client'

import { Suspense, useState } from 'react'
import { useParams } from 'next/navigation'
import { Building, Link as LinkIcon, Landmark } from 'lucide-react'
import { EntityName } from '@/components/ui/entity-name'
import { MandateExplorer } from '@/components/mandate-explorer'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MetadataItem } from '@/components/ui/metadata-item'
import { formatUrlForDisplay } from '@/lib/utils'

interface Entity {
  entity: string
  entity_long: string
  url?: string
  principal_organ?: string
  transparency_portal_link?: string
}

function EntityPageContent () {
  const params = useParams()
  const entityName = decodeURIComponent(params.entity as string)

  const [entityDetails, setEntityDetails] = useState<Entity | null>(null)

  // Callback to receive entity details from MandateExplorer
  const handleEntityDetailsLoaded = (entities: Entity[]) => {
    const foundEntity = entities.find(e => e.entity === entityName)
    if (foundEntity) {
      setEntityDetails(foundEntity)
    }
  }

  return (
    <div>
      <div className='mb-6'>
        <div className='flex items-center gap-4 mb-2'>
          <div className='rounded-lg bg-un-blue/10 p-2 w-12 flex items-center justify-center'>
            <Building className='h-6 w-6 text-un-blue' />
          </div>
          <h1 className='text-2xl font-bold tracking-tight'>
            {entityDetails?.entity_long} ({entityName})
          </h1>
        </div>

        {!entityDetails ? (
          <div className='space-y-2 mt-4 ml-16'>
            <Skeleton className='h-6 w-48' />
          </div>
        ) : (
          <div className='space-y-0 ml-16'>
            {entityDetails.url && (
              <MetadataItem label='Website' icon={LinkIcon}>
                <a
                  href={entityDetails.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-un-blue underline break-all hover:text-un-blue/80 transition-colors'
                >
                  {formatUrlForDisplay(entityDetails.url)}
                </a>
              </MetadataItem>
            )}
            {entityDetails.transparency_portal_link && (
              <MetadataItem label='Transparency Portal' icon={LinkIcon}>
                <a
                  href={entityDetails.transparency_portal_link}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-un-blue underline break-all hover:text-un-blue/80 transition-colors'
                >
                  {formatUrlForDisplay(entityDetails.transparency_portal_link)}
                </a>
              </MetadataItem>
            )}
          </div>
        )}
      </div>

      {/* Mandate Explorer - now passes callback to receive entity details */}
      <MandateExplorer 
        pageType='entity' 
        entityFilter={entityName}
        onEntityDetailsLoaded={handleEntityDetailsLoaded}
      />
    </div>
  )
}

export default function EntityPage () {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EntityPageContent />
    </Suspense>
  )
}
