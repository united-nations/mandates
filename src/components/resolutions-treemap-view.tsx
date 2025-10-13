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
import { squarify, TreemapItem, TreemapRect, formatNumber, formatPercentage, formatApproximate } from '@/lib/treemap-utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface BucketWithData extends BucketDefinition {
  bucketData: BucketData;
}

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

  // Prepare treemap items
  const items: TreemapItem<BucketWithData>[] = buckets
    .map(bucket => ({
      value: bucketsData[bucket.id]?.count || 0,
      data: {
        ...bucket,
        bucketData: bucketsData[bucket.id] || { count: 0, percentage: 0 },
      },
    }))
    .filter(item => item.value > 0);

  // Calculate layout (100x100 coordinate system)
  const rects: TreemapRect<BucketWithData>[] = squarify(items, 0, 0, 100, 100);

  return (
    <div className="w-full mb-8">
      <div className="w-full h-[calc(100vh-320px)] min-h-[500px] mb-4">
        <div className="relative w-full h-full bg-muted">
          {rects.map((rect, index) => {
            const bucket = rect.data;
          const bucketData = bucket.bucketData;
          const isHovered = hoveredBucket === bucket.id;
          
          // Always show labels if box has any reasonable size
          const showLabel = rect.width > 1.5 && rect.height > 1;
          
          // Normal font sizes
          const normalTitleSize = 16;
          const normalDetailSize = 13;
          const normalPadding = 8;
          
          // Estimate space needed for normal text
          // Rough estimate: 1% width = ~10px, 1% height = ~7-8px
          const estimatedTextWidth = rect.width * 10; // px
          const estimatedTextHeight = rect.height * 7; // px
          
          // Only scale down if box is too small for normal text
          // Check if we have space for at least 6-7 characters at normal size (~80px) and 2 lines (~30px)
          const needsScaling = estimatedTextWidth < 80 || estimatedTextHeight < 30;
          
          let titleFontSize = normalTitleSize;
          let detailFontSize = normalDetailSize;
          let padding = normalPadding;
          
          if (needsScaling) {
            // Scale down proportionally when needed
            const widthScale = estimatedTextWidth / 80;
            const heightScale = estimatedTextHeight / 30;
            const scale = Math.min(widthScale, heightScale);
            
            titleFontSize = Math.max(9, normalTitleSize * scale);
            detailFontSize = Math.max(8, normalDetailSize * scale);
            padding = Math.max(4, normalPadding * scale);
          }
          
          // Only show details if there's enough space
          const showDetails = detailFontSize >= 9 && estimatedTextHeight >= 20;

          // Determine text color based on background lightness
          const bgColor = colors[bucket.id] || '#E5E7EB';
          const isLightBg = bgColor === '#E5E7EB' || bgColor === '#BFDBFE';
          const textColor = isLightBg ? '#1F2937' : '#FFFFFF';

          return (
            <Tooltip key={`${bucket.id}-${index}`} delayDuration={50} disableHoverableContent>
              <TooltipTrigger asChild>
                <div
                  data-bucket={bucket.id}
                  className="absolute cursor-pointer transition-opacity"
                  style={{
                    left: `${rect.x}%`,
                    top: `${rect.y}%`,
                    width: `${rect.width}%`,
                    height: `${rect.height}%`,
                    backgroundColor: bgColor,
                    color: textColor,
                    opacity: isHovered ? 1 : 0.9,
                    zIndex: isHovered ? 10 : 1,
                  }}
                  onClick={() => onCellClick(dimension, bucket.id)}
                  onMouseEnter={() => setHoveredBucket(bucket.id)}
                  onMouseLeave={() => setHoveredBucket(null)}
                >
                  {showLabel && (
                    <div 
                      className="h-full flex flex-col justify-start items-start overflow-hidden"
                      style={{ padding: `${padding}px` }}
                    >
                      <div 
                        className="font-bold leading-tight text-left"
                        style={{ 
                          fontSize: `${titleFontSize}px`,
                          marginBottom: showDetails ? `${padding / 5}px` : 0
                        }}
                      >
                        {bucket.id === 'unknown'
                          ? 'Word count not available'
                          : bucket.id === 'new'
                          ? bucket.label
                          : bucket.id === 'one-time'
                          ? bucket.label
                          : `${bucket.label} ${dimension === 'length' ? 'words' : dimension === 'similarity' ? 'similar' : 'ago'}`}
                      </div>
                      {showDetails && (
                        <div 
                          className="leading-tight text-left opacity-90"
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
                side="top"
                sideOffset={8}
                className="bg-popover text-popover-foreground border border-border shadow-lg max-w-xs sm:max-w-sm"
                hideWhenDetached
                avoidCollisions={true}
                collisionPadding={12}
              >
                <div className="text-center max-w-xs sm:max-w-sm p-1">
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
