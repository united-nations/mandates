'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import DocumentTable from '@/components/document-table';
import ResolutionsTreemapView from '@/components/resolutions-treemap-view';
import { resolutionsConfig } from '@/lib/document-configs';
import { Resolution, DocumentFilters } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, RotateCcw } from 'lucide-react';
import { lengthBuckets } from '@/lib/treemap-config';
import { LoadingFallback } from '@/components/ui/loading-fallback';

function ResolutionsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read all state from URL (single source of truth)
  const view = searchParams.get('view') || 'treemap';
  const dimension = (searchParams.get('dimension') as 'length' | 'similarity') || 'length';
  
  // Centralized filters object
  const filters: DocumentFilters = {
    organ: searchParams.get('organ') || undefined,
    is_recurring_series: searchParams.get('is_recurring_series') || undefined,
    length_bucket: searchParams.get('length_bucket') || undefined,
    similarity_bucket: searchParams.get('similarity_bucket') || undefined,
  };

  // Helper to update URL with any parameter changes
  const updateURL = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    router.replace(`${pathname}?${params}`, { scroll: false });
  };

  // View switching
  const switchToTreemap = () => {
    updateURL({ view: null }); // treemap is default
  };

  const switchToTable = () => {
    updateURL({ view: 'table' });
  };

  // Handle treemap cell click - set the appropriate bucket filter and switch to table
  const handleCellClick = (clickedDimension: 'length' | 'similarity', bucketId: string) => {
    updateURL({
      view: 'table',
      length_bucket: clickedDimension === 'length' ? bucketId : null,
      similarity_bucket: clickedDimension === 'similarity' ? bucketId : null,
      page: null, // Reset pagination
    });
  };

  // Filter handlers
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

  const handleLengthBucketChange = (value: string) => {
    updateURL({
      length_bucket: value === 'all' ? null : value,
      page: null,
    });
  };

  const handleResetFilters = () => {
    updateURL({
      organ: null,
      is_recurring_series: null,
      length_bucket: null,
      similarity_bucket: null,
      page: null,
    });
  };

  // Check if there are any active filters
  const hasActiveFilters = 
    filters.organ || 
    filters.is_recurring_series || 
    filters.length_bucket || 
    filters.similarity_bucket;

  // Display values for selects
  const selectedOrgan = filters.organ || 'all';
  const selectedRecurringSeries = filters.is_recurring_series || 'all';
  const selectedLengthBucket = filters.length_bucket || 'all';

  const recurringSeriesOptions = [
    { value: 'all', label: 'All Documents' },
    { value: 'true', label: 'Recurring Documents' },
    { value: 'false', label: 'One-time Documents' },
  ];

  const lengthBucketOptions = [
    { value: 'all', label: 'All Lengths' },
    ...lengthBuckets.filter(b => b.id !== 'unknown').map(b => ({
      value: b.id,
      label: b.label + ' words'
    }))
  ];

  return (
    <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
      {/* Header with filters - always visible */}
      <div className="max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 mb-6 pt-8">
        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-un-blue" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              All Resolutions
            </h1>
          </div>

          {/* View toggle buttons - always visible */}
          <div className="inline-flex h-9 items-center justify-center gap-0.5 rounded-md border border-med-gray bg-muted p-0.5 text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              onClick={switchToTreemap}
              className={`h-full px-3 text-sm font-medium transition-colors rounded-sm ${
                view === 'treemap'
                  ? 'bg-background text-un-blue shadow-sm pointer-events-none'
                  : 'hover:bg-background/60 hover:text-foreground'
              }`}
            >
              Treemap
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={switchToTable}
              className={`h-full px-3 text-sm font-medium transition-colors rounded-sm ${
                view === 'table'
                  ? 'bg-background text-un-blue shadow-sm pointer-events-none'
                  : 'hover:bg-background/60 hover:text-foreground'
              }`}
            >
              Table
            </Button>
          </div>

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
              disabled={!hasActiveFilters}
              className="h-9 px-3 text-sm border-med-gray bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Reset filters to default"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Advanced filters - only show in table view */}
        {view === 'table' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">Advanced:</span>
            <Select value={selectedLengthBucket} onValueChange={handleLengthBucketChange}>
              <SelectTrigger id="length-filter" className="w-40 h-9 px-3 text-sm border-med-gray focus:border-blue-500 focus:ring-blue-500 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lengthBucketOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Content */}
      {view === 'treemap' ? (
        <div className="max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-8 sm:px-12 lg:px-16">
          <ResolutionsTreemapView
            filters={filters}
            dimension={dimension}
            onCellClick={handleCellClick}
          />
        </div>
      ) : (
        <DocumentTable<Resolution> 
          config={resolutionsConfig} 
          filters={filters}
          hideHeader={true} 
        />
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
