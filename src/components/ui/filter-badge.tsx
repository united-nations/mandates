import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterBadgeProps {
  /**
   * The icon to display (from lucide-react)
   */
  icon?: LucideIcon
  
  /**
   * The label text to display
   */
  label: React.ReactNode
  
  /**
   * Whether to show a clear button
   * @default true
   */
  showClearButton?: boolean
  
  /**
   * Callback when clear button is clicked
   */
  onClear?: () => void
  
  /**
   * The variant type determines the styling
   * - 'default': Default badge styling
   * - 'secondary': Secondary badge styling (used in FilterControls)
   * - 'outline-solid': Outline badge styling
   */
  variant?: 'default' | 'secondary' | 'outline-solid'
  
  /**
   * Additional CSS classes
   */
  className?: string
}

export function FilterBadge({
  icon: Icon,
  label,
  showClearButton = true,
  onClear,
  variant = 'secondary',
  className
}: FilterBadgeProps) {
  const badgeClasses = cn(
    'flex items-center gap-2 px-3 py-1.5',
    variant === 'secondary' && 'bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200',
    className
  )
  
  return (
    <Badge variant={variant} className={badgeClasses}>
      {Icon && <Icon className="h-3 w-3" />}
      <span className="text-sm font-medium">{label}</span>
      {showClearButton && onClear && (
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 hover:bg-slate-300 rounded-full"
          onClick={onClear}
          title="Clear filter"
          type="button"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </Badge>
  )
} 