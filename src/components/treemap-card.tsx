'use client';

import { useState } from 'react';
import { BucketData } from '@/types';
import { BucketDefinition } from '@/lib/treemap-config';
import { squarify, TreemapItem, TreemapRect, formatNumber, formatPercentage, formatApproximate } from '@/lib/treemap-utils';

interface BucketWithData extends BucketDefinition {
  bucketData: BucketData;
}

interface TreemapCardProps {
  title: string;
  buckets: BucketDefinition[];
  bucketsData: Record<string, BucketData>;
  colors: Record<string, string>;
  onCellClick: (bucketId: string) => void;
  dimension: 'length' | 'similarity';
}

export default function TreemapCard({
  title,
  buckets,
  bucketsData,
  colors,
  onCellClick,
  dimension,
}: TreemapCardProps) {
  const [hoveredBucket, setHoveredBucket] = useState<string | null>(null);

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

  // Calculate layout (100x100 coordinate system, will scale with CSS)
  const rects: TreemapRect<BucketWithData>[] = squarify(items, 0, 0, 100, 100);

  // Minimum size threshold for displaying label (in percentage units)
  const MIN_SIZE_FOR_LABEL = 3;

  return (
    <div className="border border-gray-300 rounded-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-base font-medium text-gray-900">{title}</h3>
      </div>

      {/* Treemap */}
      <div className="p-4">
        <div
          className="relative w-full bg-gray-100 rounded-sm overflow-hidden"
          style={{ paddingBottom: '60%' }} // 5:3 aspect ratio
        >
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
          >
            {rects.map((rect, index) => {
              const bucket = rect.data;
              const bucketData = bucket.bucketData;
              const isHovered = hoveredBucket === bucket.id;
              const showLabel = rect.width >= MIN_SIZE_FOR_LABEL && rect.height >= MIN_SIZE_FOR_LABEL;

              // Determine text color based on background lightness
              const bgColor = colors[bucket.id] || '#E5E7EB';
              const isLightBg = bgColor === '#E5E7EB' || bgColor === '#BFDBFE';
              const textColor = isLightBg ? '#1F2937' : '#FFFFFF';

              return (
                <g key={`${bucket.id}-${index}`}>
                  {/* Cell rectangle */}
                  <rect
                    x={rect.x}
                    y={rect.y}
                    width={rect.width}
                    height={rect.height}
                    fill={bgColor}
                    stroke="#FFFFFF"
                    strokeWidth="0.2"
                    className="cursor-pointer transition-opacity hover:opacity-90"
                    onMouseEnter={() => setHoveredBucket(bucket.id)}
                    onMouseLeave={() => setHoveredBucket(null)}
                    onClick={() => onCellClick(bucket.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${bucket.label}: ${bucketData.count} resolutions (${formatPercentage(bucketData.percentage)})`}
                  >
                    {/* Tooltip via title element */}
                    <title>
                      {bucket.label}
                      {'\n'}
                      {formatNumber(bucketData.count)} resolutions ({formatPercentage(bucketData.percentage)})
                      {bucketData.avg_value !== undefined && bucketData.avg_value > 0 && (
                        dimension === 'length'
                          ? `\n${formatApproximate(bucketData.avg_value)} words avg`
                          : `\n${formatApproximate(bucketData.avg_value * 100)}% avg similarity`
                      )}
                      {'\n'}Click to explore
                    </title>
                  </rect>

                  {/* Label text (only if cell is large enough) */}
                  {showLabel && (
                    <text
                      x={rect.x + rect.width / 2}
                      y={rect.y + rect.height / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={textColor}
                      className="pointer-events-none select-none"
                      style={{
                        fontSize: `${Math.min(rect.width / bucket.label.length * 2, rect.height / 3)}px`,
                        fontWeight: 500,
                      }}
                    >
                      <tspan x={rect.x + rect.width / 2} dy="0">
                        {bucket.label}
                      </tspan>
                      <tspan
                        x={rect.x + rect.width / 2}
                        dy="1.2em"
                        style={{ fontSize: '0.8em', opacity: 0.9 }}
                      >
                        {formatPercentage(bucketData.percentage)}
                      </tspan>
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {buckets.map(bucket => {
            const bucketData = bucketsData[bucket.id];
            if (!bucketData || bucketData.count === 0) return null;

            return (
              <div
                key={bucket.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-sm transition-colors"
                onClick={() => onCellClick(bucket.id)}
                onMouseEnter={() => setHoveredBucket(bucket.id)}
                onMouseLeave={() => setHoveredBucket(null)}
              >
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: colors[bucket.id] }}
                />
                <span className={`text-gray-700 ${hoveredBucket === bucket.id ? 'font-medium' : ''}`}>
                  {bucket.label}: {formatNumber(bucketData.count)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
