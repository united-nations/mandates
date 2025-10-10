'use client';

import { useEffect, useState } from 'react';
import { AggregateResponse, BucketData } from '@/types';
import {
  lengthBuckets,
  similarityBuckets,
  lengthColors,
  similarityColors,
  BucketDefinition,
} from '@/lib/treemap-config';
import { squarify, TreemapItem, TreemapRect, formatNumber, formatPercentage, formatApproximate } from '@/lib/treemap-utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface BucketWithData extends BucketDefinition {
  bucketData: BucketData;
}

interface ResolutionsTreemapViewProps {
  organ?: string;
  isRecurringSeries?: string;
  dimension: 'length' | 'similarity';
  onCellClick: (dimension: 'length' | 'similarity', bucketId: string) => void;
}

export default function ResolutionsTreemapView({
  organ,
  isRecurringSeries,
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
        if (organ) {
          params.set('organ', organ);
        }
        if (isRecurringSeries) {
          params.set('is_recurring_series', isRecurringSeries);
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
  }, [organ, isRecurringSeries]);

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
  const buckets = dimension === 'length' ? lengthBuckets : similarityBuckets;
  const bucketsData = dimension === 'length' ? data.buckets.length : data.buckets.similarity;
  const colors = dimension === 'length' ? lengthColors : similarityColors;

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
    <div className="w-full h-[calc(100vh-280px)] min-h-[700px]">
      <div className="relative w-full h-full bg-muted">
        {rects.map((rect, index) => {
          const bucket = rect.data;
          const bucketData = bucket.bucketData;
          const isHovered = hoveredBucket === bucket.id;
          const showLabel = rect.width > 3 && rect.height > 2;

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
                    <div className="p-2 h-full flex flex-col justify-start items-start overflow-hidden">
                      <div className="text-base font-bold leading-tight text-left mb-1">
                        {bucket.id === 'unknown'
                          ? 'Word count not available'
                          : bucket.id === 'new'
                          ? bucket.label
                          : `${bucket.label} ${dimension === 'length' ? 'words' : 'similar'}`}
                      </div>
                      <div className="text-sm leading-tight text-left opacity-90">
                        {formatNumber(bucketData.count)} ({formatPercentage(bucketData.percentage)})
                      </div>
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
                        : `${formatApproximate(bucketData.avg_value * 100)}% avg similarity`}
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
  );
}
