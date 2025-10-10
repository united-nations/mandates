'use client';

import { Suspense, useRef, useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import DocumentTable from '@/components/document-table';
import ResolutionsTreemapView from '@/components/resolutions-treemap-view';
import { resolutionsConfig } from '@/lib/document-configs';
import { Resolution, DocumentFilters } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, RotateCcw, ChevronDown } from 'lucide-react';
import { lengthBuckets } from '@/lib/treemap-config';
import { LoadingFallback } from '@/components/ui/loading-fallback';

function ResolutionsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const dimensionTextRef = useRef<HTMLSpanElement>(null);
  const [dropdownMinWidth, setDropdownMinWidth] = useState<number>(0);

  // Read all state from URL (single source of truth)
  const view = searchParams.get('view') || 'treemap';
  const dimension = (searchParams.get('dimension') as 'length' | 'similarity') || 'length';
  
  // Centralized filters object
  const filters: DocumentFilters = {
    organ: searchParams.get('organ') || undefined,
    is_recurring_series: searchParams.get('is_recurring_series') || undefined,
    length_bucket: searchParams.get('length_bucket') || undefined,
    similarity_bucket: searchParams.get('similarity_bucket') || undefined,
    include_missing_fulltexts: searchParams.get('include_missing_fulltexts') || undefined,
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
    // Reset the bucket filter for the current dimension when switching to treemap
    const updates: Record<string, string | null> = { view: null };
    if (dimension === 'length') {
      updates.length_bucket = null;
    } else if (dimension === 'similarity') {
      updates.similarity_bucket = null;
    }
    updateURL(updates);
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

  const handleIncludeMissingFulltextsChange = (checked: boolean) => {
    updateURL({
      include_missing_fulltexts: checked ? null : 'false',
      page: null,
    });
  };

  const handleResetFilters = () => {
    updateURL({
      organ: null,
      is_recurring_series: null,
      length_bucket: null,
      similarity_bucket: null,
      include_missing_fulltexts: null,
      page: null,
    });
  };

  const handleDimensionChange = (newDimension: 'length' | 'similarity') => {
    updateURL({
      dimension: newDimension,
      // Reset bucket filters when changing dimension
      length_bucket: null,
      similarity_bucket: null,
      page: null,
    });
  };

  // Get dimension display text
  const dimensionText = dimension === 'length' ? 'Length' : 'Similarity to Previous';

  // Organ acronyms mapping
  const organAcronyms: Record<string, string> = {
    'General Assembly': 'GA',
    'Economic and Social Council': 'ECOSOC',
    'Security Council': 'SC',
    'Human Rights Council': 'HRC',
  };

  // Get organ display text for header (using acronyms)
  const organText = filters.organ 
    ? organAcronyms[filters.organ] || 'All'
    : 'All';

  // Measure the current dimension text width
  useEffect(() => {
    if (dimensionTextRef.current) {
      const width = dimensionTextRef.current.offsetWidth;
      setDropdownMinWidth(width);
    }
  }, [dimensionText]);

  // Check if there are any active filters
  const hasActiveFilters = 
    filters.organ || 
    filters.is_recurring_series || 
    filters.length_bucket || 
    filters.similarity_bucket ||
    filters.include_missing_fulltexts;

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
    ...lengthBuckets.map(b => ({
      value: b.id,
      label: b.id === 'unknown' ? b.label : b.label + ' words'
    }))
  ];

  return (
    <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
      {/* Header with filters - always visible */}
      <div className="max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 mb-6 pt-8">
        {/* Title row */}
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-8 w-8 text-un-blue" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            <span className={filters.organ ? "text-un-blue" : ""}>{organText}</span> Resolutions by{' '}
            <DropdownMenu>
              <DropdownMenuTrigger className="text-un-blue hover:text-un-blue/80 focus:outline-none inline-flex items-center gap-0.5 transition-colors">
                <span ref={dimensionTextRef} className="border-b-2 border-un-blue/20 hover:border-un-blue/40 transition-colors">
                  {dimensionText}
                </span>
                <ChevronDown className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="start" 
                className="w-auto p-0.5 border-un-blue/20 shadow-sm"
                style={{ minWidth: dropdownMinWidth }}
              >
                {dimension !== 'length' && (
                  <DropdownMenuItem 
                    onClick={() => handleDimensionChange('length')}
                    className="cursor-pointer text-sm font-semibold text-un-blue hover:text-un-blue hover:bg-un-blue/10 py-2 px-3 rounded-sm focus:text-un-blue focus:bg-un-blue/10 whitespace-nowrap"
                  >
                    Word Length
                  </DropdownMenuItem>
                )}
                {dimension !== 'similarity' && (
                  <DropdownMenuItem 
                    onClick={() => handleDimensionChange('similarity')}
                    className="cursor-pointer text-sm font-semibold text-un-blue hover:text-un-blue hover:bg-un-blue/10 py-2 px-3 rounded-sm focus:text-un-blue focus:bg-un-blue/10 whitespace-nowrap"
                  >
                    Similarity to Previous
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </h1>
        </div>

        {/* View toggle and filters row */}
        <div className="flex items-center justify-between gap-4 mb-4">
          {/* View toggle buttons */}
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
              className="h-9 w-9 p-0 border-med-gray bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Reset filters to default"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Advanced filters - only show in table view */}
        {view === 'table' && (
          <div className="flex items-center justify-end gap-2 mb-4">
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
          
          {/* Include missing fulltexts checkbox - below treemap */}
          <div className="flex items-center justify-start gap-2 mt-4">
            <Checkbox
              id="include-missing-fulltexts"
              checked={filters.include_missing_fulltexts !== 'false'}
              onCheckedChange={handleIncludeMissingFulltextsChange}
              className="border-med-gray data-[state=checked]:bg-un-blue data-[state=checked]:border-un-blue"
            />
            <label
              htmlFor="include-missing-fulltexts"
              className="text-sm text-muted-foreground cursor-pointer select-none"
            >
              Include resolutions with missing fulltexts
            </label>
          </div>
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
