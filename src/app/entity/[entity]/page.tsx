'use client';

import { Suspense, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Building, Link as LinkIcon, Landmark } from 'lucide-react';
import { EntityName } from '@/components/ui/entity-name';
import { MandateExplorer } from '@/components/mandate-explorer';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageLayout } from '@/components/ui/page-layout';
import { BackButton } from '@/components/ui/back-button';
import { MetadataItem } from '@/components/ui/metadata-item';

interface Entity {
  entity: string;
  entity_long: string;
  url?: string;
  principal_organ?: string;
  transparency_portal_link?: string;
}

function EntityPageContent() {
  const params = useParams();
  const entityName = decodeURIComponent(params.entity as string);
  
  const [entityDetails, setEntityDetails] = useState<Entity | null>(null);
  const [isLoadingEntityDetails, setIsLoadingEntityDetails] = useState(false);

  useEffect(() => {
    async function fetchEntityDetails() {
      setIsLoadingEntityDetails(true);
      try {
        // Use the unified API to get entity data
        const response = await fetch('/api/mandates?limit=1');
        if (response.ok) {
          const data = await response.json();
          const entities = data.reference?.entities || [];
          const foundEntity = entities.find((e: Entity) => e.entity === entityName);
          
          if (foundEntity) {
            setEntityDetails(foundEntity);
          }
        }
      } catch (error) {
        console.error('Failed to fetch entity details:', error);
      } finally {
        setIsLoadingEntityDetails(false);
      }
    }

    if (entityName) {
      fetchEntityDetails();
    }
  }, [entityName]);

  return (
    <PageLayout>
      <div className="mb-2">
        <BackButton />
      </div>
          
          <div className="flex items-start gap-4 mb-6">
            <div className="rounded-lg bg-un-blue/10 p-2">
              <Building className="h-6 w-6 text-un-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="mb-2">
                <h1 className="text-2xl font-bold tracking-tight mb-1">
                  <EntityName 
                    entityName={entityName} 
                    entityLong={entityDetails?.entity_long}
                    showUnderline={false} 
                  />
                </h1>
                
                {entityDetails?.principal_organ && (
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      <Landmark className="h-3 w-3 mr-1" />
                      {entityDetails.principal_organ}
                    </Badge>
                  </div>
                )}
              </div>

              {isLoadingEntityDetails ? (
                <div className="space-y-2 mt-4">
                  <Skeleton className="h-6 w-48" />
                </div>
              ) : (
                entityDetails && (
                  <div className="space-y-0">
                    {entityDetails.url && (
                      <MetadataItem label="Website" icon={LinkIcon}>
                        <a href={entityDetails.url} target="_blank" rel="noopener noreferrer" className="text-un-blue underline break-all hover:text-un-blue/80 transition-colors">
                          {entityDetails.url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')}
                        </a>
                      </MetadataItem>
                    )}
                                         {entityDetails.transparency_portal_link && (
                       <MetadataItem label="Transparency Portal" icon={LinkIcon}>
                         <a href={entityDetails.transparency_portal_link} target="_blank" rel="noopener noreferrer" className="text-un-blue underline break-all hover:text-un-blue/80 transition-colors">
                           {entityDetails.transparency_portal_link.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')}
                         </a>
                       </MetadataItem>
                     )}
                  </div>
                )
              )}
            </div>
          </div>

      {/* Mandate Explorer - now renders sidebars internally */}
      <MandateExplorer pageType="entity" entityFilter={entityName} />
    </PageLayout>
  );
}

export default function EntityPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EntityPageContent />
    </Suspense>
  );
} 