"use client";

import { TooltipProvider } from '@/components/ui/tooltip';
import { Link as LinkIcon } from 'lucide-react';

export default function ResourcesPage() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <main className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto py-10 px-8 sm:px-12 lg:px-16">
          <div className="flex items-center gap-3 mb-6">
            <LinkIcon className="h-8 w-8 text-un-blue" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">More Transparency Resources</h1>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Card 1: open.un.org */}
            <a href="https://open.un.org/" target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-muted p-4 transition flex flex-col items-start text-left hover:border-un-blue">
              <img src="/screenshots/open.un.org.png" alt="open.un.org screenshot" className="rounded-md w-full h-32 object-cover mb-3" />
              <div className="font-medium text-un-blue text-base mb-1">UN Transparency Portal</div>
              <div className="text-muted-foreground text-sm">Visual exploration of the budget of the UN secretariat and UN system.</div>
            </a>
            {/* Card 2: unsceb.org/financial-statistics */}
            <a href="https://unsceb.org/financial-statistics" target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-muted p-4 transition flex flex-col items-start text-left hover:border-un-blue">
              <img src="/screenshots/unsceb.org.png" alt="unsceb.org/financial-statistics screenshot" className="rounded-md w-full h-32 object-cover mb-3" />
              <div className="font-medium text-un-blue text-base mb-1">CEB Financial Statistics</div>
              <div className="text-muted-foreground text-sm">Financial statistics from the UN System Chief Executives Board.</div>
            </a>
            {/* Card 3: results.un.org */}
            <a href="https://results.un.org/" target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-muted p-4 transition flex flex-col items-start text-left hover:border-un-blue">
              <img src="/screenshots/results.un.org.png" alt="results.un.org screenshot" className="rounded-md w-full h-32 object-cover mb-3" />
              <div className="font-medium text-un-blue text-base mb-1">Programme Budget Results</div>
              <div className="text-muted-foreground text-sm">Results information for the proposed programme budget 2025.</div>
            </a>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
} 