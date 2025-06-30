'use client';

import { Suspense, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Landmark } from 'lucide-react';
import Link from 'next/link';
import { MandateExplorer } from '@/components/mandate-explorer';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConsolidatedFilterSidebar } from '@/components/consolidated-filter-sidebar';
import { Badge } from '@/components/ui/badge';

interface Organ {
  short: string;
  long: string;
}

function OrganPageContent() {
  const params = useParams();
  const router = useRouter();
  const organName = decodeURIComponent(params.organ as string);

  const [organLongName, setOrganLongName] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [selectedOrgan, setSelectedOrgan] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrganDetails() {
      try {
        const res = await fetch('/api/organs');
        if (res.ok) {
          const data = await res.json();
          const organ = data.find((o: Organ) => o.short === organName || o.long === organName);
          if (organ) {
            setOrganLongName(organ.long);
          }
        }
      } catch (error) {
        console.error("Failed to fetch organ details:", error);
      }
    }
    if (organName) {
      fetchOrganDetails();
    }
  }, [organName]);

  const effectiveEntity = selectedEntity || undefined;
  const effectiveOrgan = selectedOrgan || organName;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <main className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto py-6 space-y-6 px-8 sm:px-12 lg:px-16">
          
          {/* Header */}
          <div className="pb-2">
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
                      <Landmark className="h-6 w-6 text-un-blue" />
                    </div>
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                        {organLongName || organName}
                      </h1>
                      {organLongName && organLongName !== organName && (
                        <Badge variant="outline" className="mt-1">{organName}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-muted-foreground mt-2 sm:text-justify">
                  <p className="leading-tight mb-3">
                    Exploring mandate documents issued by <strong>{organLongName || organName}</strong>. This view shows all source documents 
                    issued by this organ/body, which establish mandates for UN entities.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <MandateExplorer 
            presetEntity={effectiveEntity}
            presetOrgan={effectiveOrgan}
            showEntityCard={true}
            mandateListTitle={`Documents Issued by ${organLongName || organName}`}
            crossCitationsSidebar={null}
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