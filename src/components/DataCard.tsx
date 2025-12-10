"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";

interface ChartDataItem {
  name: string;
  count: number;
}

interface DataCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description: string;
  isLoading?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  chartData?: ChartDataItem[];
  showChart?: boolean;
}

function ChartBar({
  item,
  maxCount,
}: {
  item: ChartDataItem;
  maxCount: number;
}) {
  const barWidth = (item.count / maxCount) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 shrink-0 text-right text-xs font-medium text-trout">
        {item.name}
      </div>
      <div className="relative h-3 flex-1 rounded-full bg-gray-200">
        <div
          className="h-3 rounded-full bg-un-blue transition-all duration-300"
          style={{ width: `${Math.max(barWidth, 6)}%` }}
        />
      </div>
      <div className="w-8 shrink-0 text-right text-xs text-muted-foreground">
        {item.count}
      </div>
    </div>
  );
}

function formatValue(value: string | number, isLoading: boolean) {
  if (isLoading) return <Skeleton className="h-12 w-32" />;
  if (typeof value === "number" && value > 0) return value.toLocaleString();
  return value;
}

export function DataCard({
  title,
  value,
  icon: Icon,
  description,
  isLoading = false,
  isOpen = false,
  onOpenChange,
  chartData,
  showChart = false,
}: DataCardProps) {
  const sortedChartData = chartData
    ?.sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const maxCount = chartData ? Math.max(...chartData.map((d) => d.count)) : 0;

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Card
          onMouseEnter={() => onOpenChange?.(true)}
          onMouseLeave={() => onOpenChange?.(false)}
          className="h-full min-w-[250px] cursor-help snap-center border-0 bg-un-blue/10 px-6 py-4 shadow-none transition-all hover:scale-[1.02] sm:min-w-0"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0">
            <CardTitle className="text-left text-lg font-normal leading-tight text-un-blue">
              {title}
            </CardTitle>
            <Icon className="size-5 shrink-0 text-un-blue" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-left text-4xl font-bold leading-tight tabular-nums text-foreground">
              {formatValue(value, isLoading)}
            </div>
          </CardContent>
        </Card>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          {showChart && sortedChartData && sortedChartData.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Documents by Organ or Body:
              </p>
              <div className="space-y-1">
                {sortedChartData.map((item, index) => (
                  <ChartBar key={index} item={item} maxCount={maxCount} />
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
