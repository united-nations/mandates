'use client';

import { Suspense, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Landmark, Link as LinkIcon } from 'lucide-react';
import { MandateExplorer } from '@/components/mandate-explorer';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageLayout } from '@/components/ui/page-layout';
import { BackButton } from '@/components/ui/back-button';
import { MetadataItem } from '@/components/ui/metadata-item';

function OrganPageContent() {
  const params = useParams();
  const organName = decodeURIComponent(params.organ as string);
  
  const [organDetails, setOrganDetails] = useState<{
    short: string;
    long: string;
    website?: string;
  } | null>(null);
  const [isLoadingOrganDetails, setIsLoadingOrganDetails] = useState(false);

  useEffect(() => {
    async function fetchOrganDetails() {
      setIsLoadingOrganDetails(true);
      try {
        // Use the unified API to get organ data
        const response = await fetch('/api/mandates?limit=1');
        if (response.ok) {
          const data = await response.json();
          const organs = data.reference?.organs || [];
          const foundOrgan = organs.find((o: any) => o.short === organName);
          
          if (foundOrgan) {
            setOrganDetails(foundOrgan);
          }
        }
      } catch (error) {
        console.error('Failed to fetch organ details:', error);
      } finally {
        setIsLoadingOrganDetails(false);
      }
    }

    if (organName) {
      fetchOrganDetails();
    }
  }, [organName]);

  return (
    <PageLayout>
      <div className="mb-2">
        <BackButton />
      </div>
          
          <div className="flex items-start gap-4 mb-6">
            <div className="rounded-lg bg-un-blue/10 p-2">
              <Landmark className="h-6 w-6 text-un-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="mb-2">
                <h1 className="text-2xl font-bold tracking-tight mb-1">
                  {organDetails?.long || organName}
                </h1>
                
                {organDetails?.short && organDetails.short !== organDetails.long && (
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {organDetails.short}
                    </Badge>
                  </div>
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

      {/* Mandate Explorer - now renders sidebars internally */}
      <MandateExplorer pageType="organ" organFilter={organName} />
    </PageLayout>
  );
}

export default function OrganPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrganPageContent />
    </Suspense>
  );
} 