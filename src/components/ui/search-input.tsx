import { forwardRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * The variant type determines the styling
   * - 'border-bottom': Used in sidebars with bottom border only
   * - 'bordered': Standard bordered input
   * - 'minimal': Minimal styling with transparent background
   */
  variant?: 'border-bottom' | 'bordered' | 'minimal'
  
  /**
   * Whether to show a clear button when there's content
   * @default false
   */
  showClearButton?: boolean
  
  /**
   * Callback when clear button is clicked
   */
  onClear?: () => void
  
  /**
   * Additional CSS classes
   */
  className?: string
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ 
    variant = 'bordered', 
    showClearButton = false,
    onClear,
    className,
    value,
    ...props 
  }, ref) => {
    const hasValue = value && value.toString().length > 0
    
    const getVariantStyles = () => {
      switch (variant) {
        case 'border-bottom':
          return 'border-0 border-b border-muted bg-transparent focus-visible:ring-0 focus-visible:border-un-blue rounded-none'
        case 'minimal':
          return 'border-0 bg-transparent focus-visible:ring-0 focus-visible:border-un-blue'
        case 'bordered':
        default:
          return 'border border-input'
      }
    }
    
    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={ref}
          value={value}
          className={cn(
            'pl-10',
            showClearButton && hasValue && 'pr-10',
            'h-9 text-sm',
            getVariantStyles(),
            className
          )}
          {...props}
        />
        {showClearButton && hasValue && onClear && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-blue-100 rounded-full"
            onClick={onClear}
            title="Clear search"
            type="button"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    )
  }
)

SearchInput.displayName = 'SearchInput' 