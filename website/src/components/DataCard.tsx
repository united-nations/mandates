import { Card } from '@/components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface PreviewItem {
  name: string
  count: number
}

interface DataCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description: string
  isLoading?: boolean
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  previewItems?: PreviewItem[]
  totalItems?: number
  children?: ReactNode
  activeFilterCount?: number
}

function MiniBar({ item, maxCount }: { item: PreviewItem; maxCount: number }) {
  const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 shrink-0 truncate text-right text-[10px] text-muted-foreground">
        {item.name}
      </div>
      <div className="relative h-1.5 flex-1 rounded-full bg-un-blue/10">
        <div
          className="h-1.5 rounded-full bg-un-blue/50"
          style={{ width: `${Math.max(barWidth, 4)}%` }}
        />
      </div>
      <div className="w-6 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
        {item.count.toLocaleString()}
      </div>
    </div>
  )
}

function formatValue(value: string | number, isLoading: boolean) {
  if (isLoading) return <Skeleton className="h-8 w-20" />
  if (typeof value === 'number' && value > 0) return value.toLocaleString()
  return value
}

export function DataCard({
  title,
  value,
  icon: Icon,
  description,
  isLoading = false,
  isOpen = false,
  onOpenChange,
  previewItems,
  totalItems,
  children,
  activeFilterCount = 0,
}: DataCardProps) {
  const previewSlice = previewItems?.slice(0, 4)
  const maxCount = previewSlice
    ? Math.max(...previewSlice.map((d) => d.count))
    : 0
  const remaining =
    totalItems !== undefined && previewSlice
      ? totalItems - previewSlice.length
      : 0

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Card
          className={cn(
            'relative h-full min-w-[220px] cursor-pointer snap-center border-0 bg-un-blue/10 px-4 py-3 shadow-none transition-all hover:scale-[1.02] sm:min-w-0',
            activeFilterCount > 0 && 'ring-2 ring-un-blue/40'
          )}
        >
          <div className="flex items-center gap-2">
            <Icon className="size-4 shrink-0 text-un-blue" />
            <span className="text-sm leading-tight font-medium text-un-blue">
              {title}
            </span>
            <span className="ml-auto text-xl leading-tight font-bold tabular-nums text-foreground">
              {formatValue(value, isLoading)}
            </span>
          </div>
          {previewSlice && previewSlice.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {previewSlice.map((item, i) => (
                <MiniBar key={i} item={item} maxCount={maxCount} />
              ))}
              {remaining > 0 && (
                <div className="pt-0.5 text-right text-[10px] text-muted-foreground">
                  +{remaining} more
                </div>
              )}
            </div>
          )}
          {activeFilterCount > 0 && (
            <div className="mt-1.5 flex items-center gap-1">
              <div className="size-1.5 rounded-full bg-un-blue" />
              <span className="text-[10px] font-medium text-un-blue">
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}{' '}
                active
              </span>
            </div>
          )}
        </Card>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-[60vh] w-[calc(100vw-2rem)] overflow-y-auto sm:w-96"
        side="bottom"
        align="start"
      >
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </PopoverContent>
    </Popover>
  )
}
