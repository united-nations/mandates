import { cn } from '@/lib/utils'
import { ExternalLink, Filter } from 'lucide-react'

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
  countClassName
}: SidebarListItemProps) {
  const progressPercentage = maxCount > 0 ? (count / maxCount) * 100 : 0
  
  // Different styles based on variant
  const baseStyles = "flex items-center justify-between p-3 rounded-lg cursor-pointer group transition-all duration-200"
  
  const variantStyles = {
    navigation: {
      container: "hover:bg-blue-50 hover:border-blue-200 border border-transparent hover:shadow-sm",
      label: "group-hover:text-blue-600 group-hover:underline decoration-blue-400 underline-offset-2 transition-all duration-200",
      active: "", // Navigation items don't have active state since they navigate away
      icon: <ExternalLink className="h-3 w-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />,
      progressBar: "bg-blue-500/60"
    },
    filter: {
      container: "hover:bg-slate-100 border border-transparent hover:border-slate-200",
      label: "transition-colors duration-200",
      active: "bg-un-blue/15 border-un-blue/40 shadow-sm ring-1 ring-un-blue/20",
      icon: <Filter className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />,
      progressBar: "bg-un-blue/60"
    }
  }
  
  const currentVariant = variantStyles[variant]
  
  return (
    <div
      className={cn(
        baseStyles,
        currentVariant.container,
        isActive && currentVariant.active,
        className
      )}
      onClick={onClick}
    >
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <div className={cn(
          "text-sm font-medium truncate",
          currentVariant.label
        )}>
          {label}
        </div>
        {currentVariant.icon}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 w-32">
        <span className="flex items-center w-full">
          <span className={cn(
            'text-xs font-mono text-slate-600 text-right pr-2 min-w-[28px] max-w-[32px] flex-shrink-0 justify-end flex',
            variant === 'navigation' && 'group-hover:text-blue-600',
            countClassName
          )}>
            {count.toLocaleString()}
          </span>
          {showProgressBar && (
            <span className="relative flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <span 
                className={cn(
                  "absolute left-0 top-0 h-2 rounded-full transition-all duration-300",
                  currentVariant.progressBar
                )} 
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