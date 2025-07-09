'use client';

import { Suspense, useState } from 'react';
import { useParams } from 'next/navigation';
import { Landmark, Link as LinkIcon } from 'lucide-react';
import { MandateExplorer } from '@/components/mandate-explorer';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageLayout } from '@/components/ui/page-layout';
import { BackButton } from '@/components/ui/back-button';
import { MetadataItem } from '@/components/ui/metadata-item';
import { formatUrlForDisplay } from '@/lib/utils';

function OrganPageContent() {
  const params = useParams();
  const organName = decodeURIComponent(params.organ as string);
  
  const [organDetails, setOrganDetails] = useState<{
    short: string;
    long: string;
    website?: string;
  } | null>(null);

  // Callback to receive organ details from MandateExplorer
  const handleOrganDetailsLoaded = (organs: any[]) => {
    const foundOrgan = organs.find((o: any) => o.short === organName);
    if (foundOrgan) {
      setOrganDetails(foundOrgan);
    }
  };

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

              {!organDetails ? (
                <div className="space-y-2 mt-4">
                  <Skeleton className="h-6 w-48" />
                </div>
              ) : (
                <div className="space-y-0">
                  {organDetails.website && (
                    <MetadataItem label="Website" icon={LinkIcon}>
                      <a href={organDetails.website} target="_blank" rel="noopener noreferrer" className="text-un-blue underline hover:text-un-blue/80 transition-colors">
                        {formatUrlForDisplay(organDetails.website, 35)}
                      </a>
                    </MetadataItem>
                  )}
                </div>
              )}
            </div>
          </div>

      {/* Mandate Explorer - now passes callback to receive organ details */}
      <MandateExplorer 
        pageType="organ" 
        organFilter={organName}
        onOrganDetailsLoaded={handleOrganDetailsLoaded}
      />
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