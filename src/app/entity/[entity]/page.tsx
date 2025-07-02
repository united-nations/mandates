'use client';

import { Suspense, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building, Link as LinkIcon, Landmark } from 'lucide-react';
import { EntityName } from '@/components/ui/entity-name';
import { MandateExplorer } from '@/components/mandate-explorer';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConsolidatedFilterSidebar } from '@/components/consolidated-filter-sidebar';
import { OrganListSidebar } from '@/components/organ-list-sidebar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Entity {
  entity: string;
  entity_long: string;
  url?: string;
  principal_organ?: string;
}

const MetadataItem = ({ label, children, icon: Icon }: { label: React.ReactNode, children: React.ReactNode, icon?: React.ElementType }) => (
    <div className="flex items-center gap-3 text-sm py-1.5">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
        <div className="font-medium text-muted-foreground">{label}:</div>
        <div className="text-foreground">{children}</div>
    </div>
);

function EntityPageContent() {
  const params = useParams();
  const router = useRouter();
  const entityName = decodeURIComponent(params.entity as string);

  const [entityDetails, setEntityDetails] = useState<{
    entity: string;
    entityLong: string;
    url: string | null;
    principalOrgan: string | null;
  } | null>(null);
  const [isLoadingEntityDetails, setIsLoadingEntityDetails] = useState(true);

  useEffect(() => {
    async function fetchEntityDetails() {
      setIsLoadingEntityDetails(true);
      try {
        const res = await fetch(`/api/entities/${encodeURIComponent(entityName)}`);
        if (res.ok) {
          const entity = await res.json();
          setEntityDetails({
            entity: entity['Entity'],
            entityLong: entity['Entity-Long'],
            url: entity['Entity URL'] || null,
            principalOrgan: entity['UN Principal Organ'] || null,
          });
        } else if (res.status === 404) {
          console.warn(`Entity "${entityName}" not found`);
        }
      } catch (error) {
        console.error("Failed to fetch entity details:", error);
      } finally {
        setIsLoadingEntityDetails(false);
      }
    }
    if (entityName) {
      fetchEntityDetails();
    }
  }, [entityName]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <main className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto py-6 space-y-6 px-8 sm:px-12 lg:px-16">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-2">
                <Button variant="outline" size="sm" className="mb-4" onClick={() => router.push('/')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Main View
                </Button>
              </div>
              
              <div className="mb-6 mt-2">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-muted rounded-md">
                    <Building className="h-6 w-6 text-un-blue" />
                  </div>
                  <div>
                    {isLoadingEntityDetails ? (
                      <>
                        <Skeleton className="h-8 w-64 mb-2" />
                        <Skeleton className="h-6 w-20" />
                      </>
                    ) : (
                      <>
                        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                          {entityDetails?.entityLong ? `${entityDetails.entity}: ${entityDetails.entityLong}` : entityDetails?.entity || entityName}
                        </h1>
                      </>
                    )}
                  </div>
                </div>

                {isLoadingEntityDetails ? (
                  <div className="space-y-2 mt-4">
                    <Skeleton className="h-6 w-48" />
                  </div>
                ) : (
                  entityDetails && entityDetails.url && (
                    <div className="space-y-1">
                      <MetadataItem label="Website" icon={LinkIcon}>
                          <a href={entityDetails.url} target="_blank" rel="noopener noreferrer" className="text-un-blue underline break-all hover:text-un-blue/80 transition-colors">
                            {entityDetails.url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')}
                          </a>
                      </MetadataItem>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          <MandateExplorer 
            showCrossCitations={false}
            crossCitationsSidebar={
              <div className="flex flex-col gap-6">
                <ConsolidatedFilterSidebar />
                <OrganListSidebar />
              </div>
            }
          />
        </main>
      </div>
    </TooltipProvider>
  );
}

export default function EntityPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EntityPageContent />
    </Suspense>
  );
} 