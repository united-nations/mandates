"use client";

import { explainerTexts } from '@/lib/explainer-texts';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MethodologyPage() {
  const router = useRouter();
  return (
    <div>
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
      <img src="/images/methodology.svg" alt="Methodology" className="w-full" />
      <hr className="my-8 border-muted" />
      <div className="max-w-[780px] text-left">
        <p className="text-sm text-muted-foreground italic sm:text-justify leading-relaxed">
          {explainerTexts.mainHeader.disclaimer}
        </p>
        <Button variant="outline" size="sm" className="mt-6 mb-20 shrink-0 inline-flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-1 sm:px-2.5 sm:py-1.5 h-auto bg-trout! text-white! hover:bg-trout/90! transition-colors" onClick={() => router.push('/resources')}>
          More Resources
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  );
} 