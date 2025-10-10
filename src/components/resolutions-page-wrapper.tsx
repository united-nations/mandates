'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import DocumentTable from './document-table';
import ResolutionsTreemapView from './resolutions-treemap-view';
import { resolutionsConfig } from '@/lib/document-configs';
import { Resolution } from '@/types';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';
import { lengthBuckets, similarityBuckets } from '@/lib/treemap-config';

export default function ResolutionsPageWrapper() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Get current state from URL
  const view = searchParams.get('view') || 'treemap';
  const dimension = (searchParams.get('dimension') as 'length' | 'similarity') || 'length';
  const lengthBucket = searchParams.get('length_bucket');
  const similarityBucket = searchParams.get('similarity_bucket');

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

  // Switch dimension
  const switchDimension = (newDimension: 'length' | 'similarity') => {
    updateURL({
      dimension: newDimension !== 'length' ? newDimension : null,
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

  return (
    <>
      {/* Content */}
      {view === 'treemap' ? (
        <ResolutionsTreemapView
          organ={searchParams.get('organ') || undefined}
          isRecurringSeries={searchParams.get('is_recurring_series') || undefined}
          dimension={dimension}
          onCellClick={handleCellClick}
        />
      ) : (
        <>
          {/* Show "Back to overview" if viewing a filtered table */}
          {isFilteredView && (
            <div className="flex items-center gap-4 mb-6">
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
          <DocumentTable<Resolution> config={resolutionsConfig} />
        </>
      )}
    </>
  );
}
