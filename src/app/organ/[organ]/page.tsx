'use client';

import { Suspense, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Landmark } from 'lucide-react';
import Link from 'next/link';
import { MandateExplorer } from '@/components/mandate-explorer';
import { TooltipProvider } from '@/components/ui/tooltip';

interface Organ {
  short: string;
  long: string;
}

function OrganViewContent() {
  const params = useParams();
  const organName = decodeURIComponent(params.organ as string);
  const [organLongName, setOrganLongName] = useState<string>('');

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
    fetchOrganDetails();
  }, [organName]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <main className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto py-6 space-y-6 px-8 sm:px-12 lg:px-16">
          
          {/* Header */}
          <section className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2">
                  <Link href="/">
                    <Button variant="outline" size="sm" className="mb-4">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Main View
                    </Button>
                  </Link>
                </div>
                
                <div className="mb-6 mt-2">
                  <div className="flex items-center gap-3 mb-2">
                    <Landmark className="h-8 w-8 text-un-blue" />
                    <h1 className="text-4xl font-bold tracking-tight text-foreground">
                      {organLongName || organName}
                    </h1>
                  </div>
                  {organLongName && organLongName !== organName && (
                    <div className="text-muted-foreground">
                      <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{organName}</span>
                    </div>
                  )}
                </div>
                
                <div className="text-muted-foreground mt-2 sm:text-justify">
                  <p className="leading-tight mb-3">
                    Exploring mandate documents issued by <strong>{organLongName || organName}</strong>. This view shows all source documents 
                    issued by this organ/body, which establish mandates for UN entities.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Mandate Explorer with preset organ filter */}
          <section>
            <MandateExplorer 
              presetOrgan={organName}
              showEntityCard={false}
              mandateListTitle={`Documents Issued by ${organLongName || organName}`}
              hideImplicitFilterChip={true}
            />
          </section>
        </main>
      </div>
    </TooltipProvider>
  );
}

export default function OrganPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrganViewContent />
    </Suspense>
  );
} 