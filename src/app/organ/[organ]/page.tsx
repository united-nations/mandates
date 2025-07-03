'use client';

import { Suspense, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Landmark, Link as LinkIcon } from 'lucide-react';
import { MandateExplorer } from '@/components/mandate-explorer';
import { TooltipProvider } from '@/components/ui/tooltip';
import { EntityListSidebar } from '@/components/entity-list-sidebar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const MetadataItem = ({ label, children, icon: Icon }: { label: React.ReactNode, children: React.ReactNode, icon?: React.ElementType }) => (
    <div className="flex items-center gap-2 text-sm py-1">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
        <div className="font-medium text-muted-foreground">{label}:</div>
        <div className="text-foreground">{children}</div>
    </div>
);

function OrganPageContent() {
  const params = useParams();
  const router = useRouter();
  const organName = decodeURIComponent(params.organ as string);

  const [organDetails, setOrganDetails] = useState<{
    short: string;
    long: string;
    website?: string;
  } | null>(null);
  const [isLoadingOrganDetails, setIsLoadingOrganDetails] = useState(true);

  useEffect(() => {
    async function fetchOrganDetails() {
      setIsLoadingOrganDetails(true);
      try {
        const res = await fetch(`/api/organs/${encodeURIComponent(organName)}`);
        if (res.ok) {
          const organ = await res.json();
          setOrganDetails(organ);
        } else if (res.status === 404) {
          console.warn(`Organ "${organName}" not found`);
        }
      } catch (error) {
        console.error("Failed to fetch organ details:", error);
      } finally {
        setIsLoadingOrganDetails(false);
      }
    }
    if (organName) {
      fetchOrganDetails();
    }
  }, [organName]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <main className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto py-6 space-y-6 px-8 sm:px-12 lg:px-16">
          
          {/* Header */}
          <div className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2">
                  <Button size="sm" className="mb-4 bg-un-blue text-white hover:bg-un-blue/90 transition-colors" onClick={() => router.push('/')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Main View
                  </Button>
                </div>
                
                <div className="mb-6 mt-2">
                  <div className="mb-2">
                    {isLoadingOrganDetails ? (
                      <>
                        <Skeleton className="h-8 w-64 mb-2" />
                      </>
                    ) : (
                      <>
                        <h1 className="text-2xl lg:text-3xl font-medium tracking-tight text-foreground">
                          {organDetails?.long ? (
                            <>
                              <span className="text-foreground">{organDetails.short}:</span> {organDetails.long}
                            </>
                          ) : (
                            <span className="text-foreground">{organDetails?.short || organName}</span>
                          )}
                        </h1>
                      </>
                    )}
                  </div>

                  {isLoadingOrganDetails ? (
                    <div className="space-y-2 mt-4">
                      <Skeleton className="h-6 w-48" />
                    </div>
                  ) : (
                    organDetails && (
                      <div className="space-y-0">
                        {organDetails.website && (
                          <MetadataItem label="Website" icon={LinkIcon}>
                            <a href={organDetails.website} target="_blank" rel="noopener noreferrer" className="text-un-blue underline hover:text-un-blue/80 transition-colors">
                              {(() => {
                                const cleanUrl = organDetails.website.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
                                const domain = cleanUrl.split('/')[0];
                                
                                // If URL is short enough, show it all
                                if (cleanUrl.length <= 35) {
                                  return cleanUrl;
                                }
                                
                                // Otherwise show domain + ...
                                return `${domain}/...`;
                              })()}
                            </a>
                          </MetadataItem>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          <MandateExplorer 
            showCrossCitations={false}
            crossCitationsSidebar={
              <div className="flex flex-col gap-6">
                <EntityListSidebar />
              </div>
            }
          />
        </main>
      </div>
    </TooltipProvider>
  );
}

export default function OrganPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrganPageContent />
    </Suspense>
  );
} 