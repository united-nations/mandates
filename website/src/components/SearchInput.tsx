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

  /** Optional help control shown inside the field when it contains a query. */
  helpControl?: React.ReactNode

  /**
   * Additional CSS classes
   */
  className?: string

  /** Additional CSS classes for the magnifier, merged over its defaults. */
  iconClassName?: string
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      variant = 'bordered',
      showClearButton = false,
      onClear,
      helpControl,
      className,
      iconClassName,
      value,
      ...props
    },
    ref
  ) => {
    const hasValue = Boolean(value && value.toString().length > 0)
    const showClear = showClearButton && hasValue && Boolean(onClear)
    const showHelp = hasValue && Boolean(helpControl)

    const getVariantStyles = () => {
      switch (variant) {
        case 'border-bottom':
          return 'border-0 border-b border-border bg-transparent focus-visible:ring-0 focus-visible:border-un-blue rounded-none'
        case 'minimal':
          return 'border-0 bg-transparent focus-visible:ring-0 focus-visible:border-un-blue'
        case 'bordered':
        default:
          return 'border border-input'
      }
    }

    return (
      <div className="relative">
        <Search
          className={cn(
            'absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground',
            iconClassName
          )}
        />
        <Input
          ref={ref}
          value={value}
          className={cn(
            'pl-10',
            (showClear || showHelp) && 'pr-10',
            showClear && showHelp && 'pr-16',
            'h-9 text-sm text-muted-foreground placeholder:text-muted-foreground',
            getVariantStyles(),
            className
          )}
          {...props}
        />
        {(showClear || showHelp) && (
          <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-2">
            {showHelp && helpControl}
            {showClear && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 rounded-full p-0 hover:bg-muted"
            onClick={onClear}
            title="Clear search"
            type="button"
          >
            <X className="h-3 w-3" />
          </Button>
            )}
          </div>
        )}
      </div>
    )
  }
)

SearchInput.displayName = 'SearchInput'
