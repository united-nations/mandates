"use client";

import { TooltipProvider } from '@/components/ui/tooltip';
import { explainerTexts } from '@/lib/explainer-texts';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MethodologyPage() {
  const router = useRouter();
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <main className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto py-10 px-8 sm:px-12 lg:px-16">
          <div className="mb-2">
            <Button variant="outline" size="sm" className="mb-4" onClick={() => router.push('/') }>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Main View
            </Button>
          </div>
          <div className="flex items-center gap-3 mb-6">
            <FileText className="h-8 w-8 text-un-blue" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Methodology</h1>
          </div>
          <div className="text-muted-foreground space-y-4 sm:text-justify mb-4 max-w-[780px] text-left">
            {explainerTexts.mainHeader.fullDescription.map((paragraph, index) => (
              <p key={index} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
          <img src="/methodology.svg" alt="Methodology" className="w-full" />
          <hr className="my-8 border-muted" />
          <div className="max-w-[780px] text-left">
            <p className="text-sm text-muted-foreground italic sm:text-justify leading-relaxed">
              {explainerTexts.mainHeader.disclaimer}
            </p>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
} 