import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LucideIcon } from 'lucide-react';

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
  showChart = false
}: DataCardProps) {
  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <div 
          onMouseEnter={() => onOpenChange?.(true)} 
          onMouseLeave={() => onOpenChange?.(false)} 
          className="h-full w-full min-w-[250px] sm:min-w-0"
          style={{
            scrollSnapAlign: 'center'
          }}
        >
          <Card className="flex flex-col h-full cursor-help border-0 shadow-none bg-un-blue/10">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 min-h-16">
              <CardTitle className="text-lg font-medium text-un-blue leading-tight">
                {title}
              </CardTitle>
              <Icon className="h-5 w-5 text-un-blue flex-shrink-0" />
            </CardHeader>
            <CardContent className="flex-grow flex items-center justify-start pt-2">
              <div className="text-4xl font-bold text-foreground tabular-nums">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  typeof value === 'number' && value > 0 ? value.toLocaleString() : value
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
              <p className="text-sm font-medium text-muted-foreground">Documents by Organ or Body:</p>
              <div className="space-y-1">
                {chartData
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 10) // Show top 10
                  .map((item, index) => {
                    const maxCount = Math.max(...chartData.map(d => d.count));
                    const barWidth = (item.count / maxCount) * 100;
                    
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-16 text-xs text-trout font-medium text-right flex-shrink-0">
                          {item.name}
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-3 relative">
                          <div 
                            className="bg-un-blue h-3 rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(barWidth, 6)}%` }}
                          />
                        </div>
                        <div className="w-8 text-xs text-muted-foreground text-right flex-shrink-0">
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
