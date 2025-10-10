'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import DocumentTable from '@/components/document-table';
import ResolutionsTreemapView from '@/components/resolutions-treemap-view';
import { resolutionsConfig } from '@/lib/document-configs';
import { Resolution } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FileText, RotateCcw } from 'lucide-react';
import { lengthBuckets, similarityBuckets } from '@/lib/treemap-config';
import { LoadingFallback } from '@/components/ui/loading-fallback';

function ResolutionsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Get current state from URL
  const view = searchParams.get('view') || 'treemap';
  const dimension = (searchParams.get('dimension') as 'length' | 'similarity') || 'length';
  const lengthBucket = searchParams.get('length_bucket');
  const similarityBucket = searchParams.get('similarity_bucket');
  const selectedOrgan = searchParams.get('organ') || 'all';
  const selectedRecurringSeries = searchParams.get('is_recurring_series') || 'all';

  // Track if we're in a filtered table view (from clicking a bucket)
  const isFilteredView = lengthBucket || similarityBucket;

  // Helper to update URL
  const updateURL = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    router.replace(`${pathname}?${params}`, { scroll: false });
  };

  // Switch to treemap view
  const switchToTreemap = () => {
    updateURL({
      view: null,
      length_bucket: null,
      similarity_bucket: null,
      page: null,
    });
  };

  // Handle cell click - switch to table with bucket filter
  const handleCellClick = (clickedDimension: 'length' | 'similarity', bucketId: string) => {
    const startTime = performance.now();

    updateURL({
      view: 'table',
      length_bucket: clickedDimension === 'length' ? bucketId : null,
      similarity_bucket: clickedDimension === 'similarity' ? bucketId : null,
      page: null,
    });

    // Log transition time
    requestAnimationFrame(() => {
      const endTime = performance.now();
      console.log(`Treemap → Table transition: ${(endTime - startTime).toFixed(2)}ms`);
    });
  };

  // Get bucket label for display
  const getActiveBucketLabel = () => {
    if (lengthBucket) {
      const bucket = lengthBuckets.find(b => b.id === lengthBucket);
      return bucket ? `Length: ${bucket.label}` : lengthBucket;
    }
    if (similarityBucket) {
      const bucket = similarityBuckets.find(b => b.id === similarityBucket);
      return bucket ? `Similarity: ${bucket.label}` : similarityBucket;
    }
    return null;
  };

  // Handle filter changes
  const handleOrganChange = (value: string) => {
    updateURL({
      organ: value === 'all' ? null : value,
      page: null,
    });
  };

  const handleRecurringSeriesChange = (value: string) => {
    updateURL({
      is_recurring_series: value === 'all' ? null : value,
      page: null,
    });
  };

  const handleResetFilters = () => {
    updateURL({
      organ: null,
      is_recurring_series: null,
      page: null,
    });
  };

  const recurringSeriesOptions = [
    { value: 'all', label: 'All Documents' },
    { value: 'true', label: 'Recurring Documents' },
    { value: 'false', label: 'One-time Documents' },
  ];

  // Handle view switch
  const switchToTable = () => {
    updateURL({
      view: 'table',
      length_bucket: null,
      similarity_bucket: null,
      page: null,
    });
  };

  return (
    <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
      {/* Header with filters - always visible */}
      <div className="max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 mb-6 pt-8">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-un-blue" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              All Resolutions
            </h1>
          </div>

          {/* View toggle buttons */}
          {!isFilteredView && (
            <div className="inline-flex items-center border border-med-gray rounded-md overflow-hidden bg-white h-9">
              <Button
                variant="ghost"
                size="sm"
                onClick={switchToTreemap}
                className={`h-full px-3 text-sm transition-colors rounded-none border-r border-med-gray/50 ${
                  view === 'treemap'
                    ? 'bg-un-blue text-white hover:bg-un-blue/90'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                Treemap
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={switchToTable}
                className={`h-full px-3 text-sm transition-colors rounded-none ${
                  view === 'table'
                    ? 'bg-un-blue text-white hover:bg-un-blue/90'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                Table
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Select value={selectedOrgan} onValueChange={handleOrganChange}>
              <SelectTrigger id="organ-filter" className="w-48 h-9 px-3 text-sm border-med-gray focus:border-blue-500 focus:ring-blue-500 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {resolutionsConfig.organOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRecurringSeries} onValueChange={handleRecurringSeriesChange}>
              <SelectTrigger id="recurring-filter" className="w-52 h-9 px-3 text-sm border-med-gray focus:border-blue-500 focus:ring-blue-500 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {recurringSeriesOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 px-3 text-sm border-med-gray"
              title="Reset filters to default"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Back to overview button for filtered table view */}
        {isFilteredView && view === 'table' && (
          <div className="flex items-center gap-4 mt-6">
            <Button
              onClick={switchToTreemap}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to overview
            </Button>

            {/* Show active bucket filter badge */}
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-sm text-sm text-blue-700">
              <span className="font-medium">{getActiveBucketLabel()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {view === 'treemap' ? (
        <div className="max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-8 sm:px-12 lg:px-16">
          <ResolutionsTreemapView
            organ={searchParams.get('organ') || undefined}
            isRecurringSeries={searchParams.get('is_recurring_series') || undefined}
            dimension={dimension}
            onCellClick={handleCellClick}
          />
        </div>
      ) : (
        <DocumentTable<Resolution> config={resolutionsConfig} hideHeader={true} />
      )}
    </div>
  );
}

export default function ResolutionsPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <ResolutionsPageContent />
        </Suspense>
    );
}
