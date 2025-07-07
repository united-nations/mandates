import { cn } from '@/lib/utils'

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
   * Additional CSS classes
   */
  className?: string
  
  /**
   * Additional CSS classes for the count display
   */
  countClassName?: string
}

export function SidebarListItem({
  label,
  count,
  maxCount,
  isActive = false,
  onClick,
  showProgressBar = true,
  className,
  countClassName
}: SidebarListItemProps) {
  const progressPercentage = maxCount > 0 ? (count / maxCount) * 100 : 0
  
  return (
    <div
      className={cn(
        'flex items-center justify-between p-2 rounded-sm hover:bg-muted/30 cursor-pointer group border-b border-muted/30 last:border-b-0',
        isActive && 'bg-un-blue/10 border-un-blue/30',
        className
      )}
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">
          {label}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 w-32">
        <span className="flex items-center w-full">
          <span className={cn(
            'text-xs font-mono text-un-blue text-right pr-2 min-w-[28px] max-w-[32px] flex-shrink-0 justify-end flex',
            countClassName
          )}>
            {count.toLocaleString()}
          </span>
          {showProgressBar && (
            <span className="relative flex-1 h-2 bg-un-blue/10 rounded">
              <span 
                className="absolute left-0 top-0 h-2 rounded bg-un-blue/60" 
                style={{ 
                  width: `${progressPercentage}%`, 
                  minWidth: count > 0 ? 2 : 0 
                }} 
              />
            </span>
          )}
        </span>
      </div>
    </div>
  )
} 