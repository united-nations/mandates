'use client';

import { Suspense, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building } from 'lucide-react';
import Link from 'next/link';
import { EntityName } from '@/components/ui/entity-name';
import { MandateExplorer } from '@/components/mandate-explorer';
import { CrossCitations } from '@/components/cross-citations';
import { TooltipProvider } from '@/components/ui/tooltip';

interface Entity {
  entity: string;
  entity_long: string;
}

function EntityViewContent() {
  const params = useParams();
  const entityName = decodeURIComponent(params.entity as string);
  const [entityLongName, setEntityLongName] = useState<string>('');

  useEffect(() => {
    async function fetchEntityDetails() {
      try {
        const res = await fetch('/api/entities');
        if (res.ok) {
          const data = await res.json();
          const entity = data.find((e: Entity) => e.entity === entityName);
          if (entity) {
            setEntityLongName(entity.entity_long);
          }
        }
      } catch (error) {
        console.error("Failed to fetch entity details:", error);
      }
    }
    fetchEntityDetails();
  }, [entityName]);

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
                    <Building className="h-8 w-8 text-un-blue" />
                    <h1 className="text-4xl font-bold tracking-tight text-foreground">
                      {entityLongName || entityName}
                    </h1>
                  </div>
                  {entityLongName && entityLongName !== entityName && (
                    <div className="text-muted-foreground">
                      <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{entityName}</span>
                    </div>
                  )}
                </div>
                
                <div className="text-muted-foreground mt-2 sm:text-justify">
                  <p className="leading-tight mb-3">
                    Exploring mandates and cross-citations for <strong>{entityLongName || entityName}</strong>. This view shows all source documents that this entity cites, 
                    along with other entities that cite the same mandates.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Mandate Explorer with preset entity filter */}
          <section>
            <MandateExplorer 
              presetEntity={entityName}
              showEntityCard={false}
              mandateListTitle={`Documents Cited by ${entityLongName || entityName}`}
            />
          </section>
        </main>
      </div>
    </TooltipProvider>
  );
}

export default function EntityPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EntityViewContent />
    </Suspense>
  );
} 