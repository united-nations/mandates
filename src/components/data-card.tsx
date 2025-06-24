import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LucideIcon } from 'lucide-react';

interface DataCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description: string;
  isLoading?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DataCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  isLoading = false,
  isOpen = false,
  onOpenChange 
}: DataCardProps) {
  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <div 
          onMouseEnter={() => onOpenChange?.(true)} 
          onMouseLeave={() => onOpenChange?.(false)} 
          className="h-full"
        >
          <Card className="flex flex-col h-full cursor-help border-0 shadow-none bg-un-blue/10">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 min-h-16">
              <CardTitle className="text-lg font-medium text-un-blue leading-tight">
                {title}
              </CardTitle>
              <Icon className="h-5 w-5 text-un-blue flex-shrink-0" />
            </CardHeader>
            <CardContent className="flex-grow flex items-center justify-start pt-2">
              <div className="text-4xl font-bold text-foreground">
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
