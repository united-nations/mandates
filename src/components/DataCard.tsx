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
  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <div
          onMouseEnter={() => onOpenChange?.(true)}
          onMouseLeave={() => onOpenChange?.(false)}
          className="h-full w-full min-w-[250px] sm:min-w-0"
          style={{
            scrollSnapAlign: "center",
          }}
        >
          <Card className="flex h-full cursor-help flex-col border-0 bg-un-blue/10 px-6 py-4 shadow-none transition-all hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0">
              <CardTitle className="text-left text-lg font-normal leading-tight text-un-blue">
                {title}
              </CardTitle>
              <Icon className="h-5 w-5 shrink-0 text-un-blue" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-left text-4xl font-bold leading-tight text-foreground tabular-nums">
                {isLoading ? (
                  <Skeleton className="h-12 w-32" />
                ) : typeof value === "number" && value > 0 ? (
                  value.toLocaleString()
                ) : (
                  value
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          {showChart && chartData && chartData.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Documents by Organ or Body:
              </p>
              <div className="space-y-1">
                {chartData
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 10) // Show top 10
                  .map((item, index) => {
                    const maxCount = Math.max(...chartData.map((d) => d.count));
                    const barWidth = (item.count / maxCount) * 100;

                    return (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-16 text-xs text-trout font-medium text-right shrink-0">
                          {item.name}
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-3 relative">
                          <div
                            className="bg-un-blue h-3 rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(barWidth, 6)}%` }}
                          />
                        </div>
                        <div className="w-8 text-xs text-muted-foreground text-right shrink-0">
                          {item.count}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
