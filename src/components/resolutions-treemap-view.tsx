'use client';

import { useEffect, useState } from 'react';
import { AggregateResponse, BucketData, DocumentFilters } from '@/types';
import {
  lengthBuckets,
  similarityBuckets,
  frequencyBuckets,
  lengthColors,
  similarityColors,
  frequencyColors,
  BucketDefinition,
} from '@/lib/treemap-config';
import { formatNumber, formatPercentage, formatApproximate } from '@/lib/treemap-utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ResolutionsTreemapViewProps {
  filters: DocumentFilters;
  dimension: 'length' | 'similarity' | 'frequency';
  onCellClick: (dimension: 'length' | 'similarity' | 'frequency', bucketId: string) => void;
}

export default function ResolutionsTreemapView({
  filters,
  dimension,
  onCellClick,
}: ResolutionsTreemapViewProps) {
  const [data, setData] = useState<AggregateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredBucket, setHoveredBucket] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ mode: 'aggregate' });
        
        // Apply all filters
        if (filters.organ) {
          params.set('organ', filters.organ);
        }
        if (filters.is_recurring_series) {
          params.set('is_recurring_series', filters.is_recurring_series);
        }
        if (filters.year_range) {
          params.set('year_range', filters.year_range);
        }
        if (filters.length_bucket) {
          params.set('length_bucket', filters.length_bucket);
        }
        if (filters.similarity_bucket) {
          params.set('similarity_bucket', filters.similarity_bucket);
        }
        if (filters.include_missing_fulltexts) {
          params.set('include_missing_fulltexts', filters.include_missing_fulltexts);
        }

        const response = await fetch(`/api/resolutions?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch aggregate data');
        }

        const result: AggregateResponse = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-280px)] min-h-[700px] flex items-center justify-center">
        <div className="text-muted-foreground text-lg">Loading treemap...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[calc(100vh-280px)] min-h-[700px] flex items-center justify-center">
        <div className="text-destructive">Error: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full h-[calc(100vh-280px)] min-h-[700px] flex items-center justify-center">
        <div className="text-muted-foreground text-lg">No data available</div>
      </div>
    );
  }

  // Select buckets and data based on dimension
  const buckets = dimension === 'length' ? lengthBuckets : dimension === 'similarity' ? similarityBuckets : frequencyBuckets;
  const bucketsData = dimension === 'length' ? data.buckets.length : dimension === 'similarity' ? data.buckets.similarity : data.buckets.frequency;
  const colors = dimension === 'length' ? lengthColors : dimension === 'similarity' ? similarityColors : frequencyColors;

  // Prepare bar segments with bucket data (already semantically ordered from treemap-config.ts)
  const segments = buckets
    .map(bucket => ({
      bucket,
      count: bucketsData[bucket.id]?.count || 0,
      percentage: bucketsData[bucket.id]?.percentage || 0,
      bucketData: bucketsData[bucket.id] || { count: 0, percentage: 0 },
    }))
    .filter(segment => segment.count > 0);

  // Calculate cumulative heights for stacking (top to bottom)
  let cumulativeHeight = 0;
  const barSegments = segments.map(segment => {
    const startY = cumulativeHeight;
    const height = segment.percentage;
    cumulativeHeight += height;
    return {
      ...segment,
      y: startY,
      height,
    };
  });

  return (
    <div className="w-full mb-8">
      <div className="w-full h-[calc(100vh-320px)] min-h-[500px] mb-4">
        <div className="relative w-full h-full bg-muted">
          {barSegments.map((segment, index) => {
            const bucket = segment.bucket;
            const bucketData = segment.bucketData;
            const isHovered = hoveredBucket === bucket.id;
            
            // Calculate font sizes based on segment height
            const heightPx = (segment.height / 100) * 500; // Estimate in pixels (min-h-[500px])
            const showLabel = heightPx > 30; // Show label if segment is at least 30px tall
            
            // Responsive font sizing based on segment height
            const titleFontSize = Math.max(12, Math.min(20, heightPx / 3));
            const detailFontSize = Math.max(11, Math.min(16, heightPx / 4));
            const showDetails = heightPx > 50; // Show count/percentage if tall enough

            // Determine text color based on background lightness
            const bgColor = colors[bucket.id] || '#E5E7EB';
            const isLightBg = bgColor === '#E5E7EB' || bgColor === '#BFDBFE';
            const textColor = isLightBg ? '#1F2937' : '#FFFFFF';

            // Get label text based on dimension
            let labelText = bucket.label;
            if (bucket.id === 'unknown') {
              labelText = 'Word count not available';
            } else if (bucket.id === 'new') {
              labelText = 'New/First';
            } else if (bucket.id === 'one-time') {
              labelText = 'One-time';
            } else {
              // Add dimension-specific suffix
              if (dimension === 'length') {
                labelText = `${bucket.label} words`;
              } else if (dimension === 'similarity') {
                labelText = `${bucket.label} similar`;
              } else if (dimension === 'frequency') {
                labelText = `${bucket.label} ago`;
              }
            }

            return (
              <Tooltip key={`${bucket.id}-${index}`} delayDuration={50} disableHoverableContent>
                <TooltipTrigger asChild>
                  <div
                    data-bucket={bucket.id}
                    className="absolute cursor-pointer transition-all hover:brightness-110"
                    style={{
                      left: '0%',
                      top: `${segment.y}%`,
                      width: '100%',
                      height: `${segment.height}%`,
                      backgroundColor: bgColor,
                      color: textColor,
                      opacity: isHovered ? 1 : 0.95,
                      zIndex: isHovered ? 10 : 1,
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                    onClick={() => onCellClick(dimension, bucket.id)}
                    onMouseEnter={() => setHoveredBucket(bucket.id)}
                    onMouseLeave={() => setHoveredBucket(null)}
                  >
                    {showLabel && (
                      <div 
                        className="h-full flex flex-col justify-center items-start overflow-hidden px-4"
                      >
                        <div 
                          className="font-bold leading-tight text-left w-full"
                          style={{ 
                            fontSize: `${titleFontSize}px`,
                          }}
                        >
                          {labelText}
                        </div>
                        {showDetails && (
                          <div 
                            className="leading-tight text-left opacity-90 mt-1"
                            style={{ 
                              fontSize: `${detailFontSize}px`
                            }}
                          >
                            {formatNumber(bucketData.count)} ({formatPercentage(bucketData.percentage)})
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={8}
                  className="bg-popover text-popover-foreground border border-border shadow-lg max-w-xs sm:max-w-sm"
                  hideWhenDetached
                  avoidCollisions={true}
                  collisionPadding={12}
                >
                  <div className="text-left max-w-xs sm:max-w-sm p-1">
                    <p className="font-medium text-xs sm:text-sm leading-tight">{bucket.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatNumber(bucketData.count)} resolutions ({formatPercentage(bucketData.percentage)})
                    </p>
                    {bucketData.avg_value !== undefined && bucketData.avg_value > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {dimension === 'length'
                          ? `${formatApproximate(bucketData.avg_value)} words avg`
                          : dimension === 'similarity'
                          ? `${formatApproximate(bucketData.avg_value * 100)}% avg similarity`
                          : `${formatApproximate(bucketData.avg_value)} years avg`}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Click to explore</p>
                    <p className="text-xs text-muted-foreground mt-1 sm:hidden">Tap to explore</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
}
