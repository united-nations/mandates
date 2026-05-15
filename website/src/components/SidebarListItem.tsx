import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SidebarListItemProps {
  /**
   * The display label for the item
   */
  label: React.ReactNode

  /**
   * The count value for this item
   */
  count: number

  /**
   * The maximum count value for calculating progress bar width
   */
  maxCount: number

  /**
   * Whether this item is currently active/selected
   * @default false
   */
  isActive?: boolean

  /**
   * Click handler for the item
   */
  onClick?: () => void

  /**
   * Whether to show the progress bar
   * @default true
   */
  showProgressBar?: boolean

  /**
   * Visual variant of the item
   * @default 'filter'
   */
  variant?: 'navigation' | 'filter'

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Additional CSS classes for the count display
   */
  countClassName?: string

  /**
   * Tooltip content to show on hover
   */
  tooltipContent?: string
}

export function SidebarListItem({
  label,
  count,
  maxCount,
  isActive = false,
  onClick,
  showProgressBar = true,
  variant = 'filter',
  className,
  countClassName,
  tooltipContent,
}: SidebarListItemProps) {
  const progressPercentage = maxCount > 0 ? (count / maxCount) * 100 : 0

  // Different styles based on variant
  const baseStyles =
    'flex items-center justify-between p-1.5 rounded-sm cursor-pointer group border-b border-muted/30 last:border-b-0'

  const variantStyles = {
    navigation: {
      container: 'hover:bg-muted/20 transition-colors',
      label: 'group-hover:text-un-blue transition-colors',
      active: '', // Navigation items don't have active state since they navigate away
    },
    filter: {
      container: 'hover:bg-muted/30 transition-colors',
      label: 'transition-colors',
      active: 'bg-un-blue/10 border-un-blue/30',
    },
  }

  const currentVariant = variantStyles[variant]

  const itemContent = (
    <div
      className={cn(
        baseStyles,
        currentVariant.container,
        isActive && currentVariant.active,
        className
      )}
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <div
          className={cn('truncate text-xs font-medium', currentVariant.label)}
        >
          {label}
        </div>
      </div>
      <div className="flex w-32 shrink-0 items-center gap-2">
        <span className="flex w-full items-center">
          <span
            className={cn(
              'flex max-w-[32px] min-w-[28px] shrink-0 justify-end pr-2 text-right text-xs tabular-nums text-un-blue',
              countClassName
            )}
          >
            {count.toLocaleString()}
          </span>
          {showProgressBar && (
            <span className="relative h-1.5 flex-1 rounded bg-un-blue/10">
              <span
                className="absolute top-0 left-0 h-1.5 rounded bg-un-blue/60"
                style={{
                  width: `${progressPercentage}%`,
                  minWidth: count > 0 ? 2 : 0,
                }}
              />
            </span>
          )}
        </span>
      </div>
    </div>
  )

  // If tooltip content is provided, wrap with tooltip
  if (tooltipContent) {
    return (
      <Tooltip delayDuration={300} disableHoverableContent={true}>
        <TooltipTrigger asChild>{itemContent}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return itemContent
}
