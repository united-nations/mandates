"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { getMandateDisplayTitle } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

import { LoadingFallback } from "@/components/loading-fallback";
import { decodeUrlSegments } from "@/lib/shared-utils";
import { useMandateData } from "@/hooks/use-mandate-data";
import { ParagraphsSection } from "@/components/paragraphs-section";
import { CitationCounts } from "@/components/citation-counts";
import { MandateMetadata } from "@/components/mandate-metadata";
import { ScrollToTop } from "@/components/scroll-to-top";

function MandatePageContent() {
  const params = useParams();
  const segments = params.segments as string[];

  // Reconstruct the full document symbol from segments
  const documentSymbol = decodeUrlSegments(segments);

  // Use unified hook for mandate and paragraphs data
  const {
    mandate,
    paragraphs,
    entities,
    isLoading: loading,
    error,
  } = useMandateData({ documentSymbol });

  if (loading) {
    return (
      <div className="pb-8">
        <div className="mb-6">
          <div className="h-8 w-64 mb-2 bg-gray-200 animate-pulse rounded" />
          <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="space-y-4">
          <div className="h-20 w-full bg-gray-200 animate-pulse rounded" />
          <div className="h-40 w-full bg-gray-200 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (error || !mandate) {
    return (
      <div className="pb-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-red-600">Mandate Not Found</h1>
          <p className="text-muted-foreground mt-2">
            Could not find mandate with document symbol:{" "}
            <code className="bg-muted px-2 py-1 rounded">{documentSymbol}</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="border-b pr-12 pb-2 md:pb-4 mb-8">
        <p className="text-base md:text-lg font-medium text-muted-foreground">
          Mandate Document
        </p>
        <h1 className="text-lg md:text-2xl font-bold mt-1 leading-tight">
          {getMandateDisplayTitle(mandate)}
        </h1>
        <p className="mt-0.5 md:mt-1 text-sm md:text-base text-muted-foreground font-mono">
          {mandate.full_document_symbol}
        </p>
        {mandate.link ? (
          <Button
            asChild
            className="mt-1.5 md:mt-4 h-7 md:h-10 text-xs md:text-sm bg-trout! text-white! hover:bg-trout/90! transition-colors"
          >
            <a
              href={mandate.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 md:gap-2"
            >
              <FileText className="h-3 w-3 md:h-4 md:w-4" />
              View PDF
            </a>
          </Button>
        ) : (
          <Button
            disabled
            variant="default"
            className="mt-1.5 md:mt-4 h-7 md:h-10 text-xs md:text-sm bg-trout/50! text-white/70! inline-flex items-center gap-1.5 md:gap-2"
          >
            <FileText className="h-3 w-3 md:h-4 md:w-4" />
            View PDF
          </Button>
        )}
      </div>

      {/* Content */}
      <div>
        <div className="space-y-10 sm:pr-2">
          {/* Metadata Section */}
          <MandateMetadata mandate={mandate} />

          {/* Citations Section */}
          <CitationCounts mandate={mandate} entities={entities} />

          {/* Paragraphs Section with TOC */}
          <ParagraphsSection
            paragraphs={paragraphs}
            documentSymbol={documentSymbol}
            isLoading={loading}
            error={error}
          />
        </div>
      </div>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}

export default function MandatePage() {
  return (
    <Suspense fallback={<LoadingFallback variant="mandate" />}>
      <MandatePageContent />
    </Suspense>
  );
}
