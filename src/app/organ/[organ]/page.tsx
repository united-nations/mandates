'use client';

import { Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Landmark } from 'lucide-react';
import { MandateExplorer } from '@/components/mandate-explorer';
import { TooltipProvider } from '@/components/ui/tooltip';
import { EntityListSidebar } from '@/components/entity-list-sidebar';
import { Badge } from '@/components/ui/badge';

function OrganPageContent() {
  const params = useParams();
  const router = useRouter();
  const organName = decodeURIComponent(params.organ as string);

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
                        <span className="text-un-blue">{organName}</span>
                      </h1>
                    </div>
                  </div>
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