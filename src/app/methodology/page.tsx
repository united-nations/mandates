"use client";

import { TooltipProvider } from '@/components/ui/tooltip';
import { explainerTexts } from '@/lib/explainer-texts';
import { FileText } from 'lucide-react';

export default function MethodologyPage() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <main className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto py-10 px-8 sm:px-12 lg:px-16">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="h-8 w-8 text-un-blue" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Methodology</h1>
          </div>
          <div className="text-muted-foreground space-y-4 sm:text-justify mb-4">
            {explainerTexts.mainHeader.fullDescription.map((paragraph, index) => (
              <p key={index} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
          <hr className="my-8 border-muted" />
          <div>
            <p className="text-sm text-muted-foreground italic sm:text-justify leading-relaxed">
              {explainerTexts.mainHeader.disclaimer}
            </p>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
} 