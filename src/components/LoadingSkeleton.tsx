import { Skeleton } from '@/components/ui/skeleton'

interface LoadingSkeletonProps {
  /**
   * The variant type determines the layout and styling
   * - 'list': Simple list of items (used in MandateExplorer)
   * - 'sidebar': Sidebar list items with count and progress bar (used in EntityListSidebar, OrganListSidebar)
   * - 'card': Card-style skeleton items
   * - 'table': Table row skeleton items
   */
  variant?: 'list' | 'sidebar' | 'card' | 'table'

  /**
   * Number of skeleton items to render
   * @default 4 for list, 8 for sidebar, 3 for card, 5 for table
   */
  count?: number

  /**
   * Whether to show icon placeholder for sidebar items
   * @default false
   */
  showIcon?: boolean

  /**
   * Additional CSS classes
   */
  className?: string
}

export function LoadingSkeleton({
  variant = 'list',
  count,
  showIcon = false,
  className = '',
}: LoadingSkeletonProps) {
  // Set default count based on variant
  const defaultCount = {
    list: 4,
    sidebar: 8,
    card: 3,
    table: 5,
  }[variant]

  const itemCount = count ?? defaultCount

  // Generate array for mapping
  const items = Array.from({ length: itemCount }, (_, i) => i)

  switch (variant) {
    case 'list':
      return (
        <div className={`space-y-4 ${className}`}>
          {items.map((i) => (
            <div key={i}>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="mt-2 h-24 w-full" />
            </div>
          ))}
        </div>
      )

    case 'sidebar':
      return (
        <div className={`space-y-2 ${className}`}>
          {items.map((i) => (
            <div key={i} className="flex items-center justify-between p-2">
              {showIcon && <Skeleton className="mr-2 h-4 w-4" />}
              <Skeleton className="h-4 w-20 flex-1" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      )

    case 'card':
      return (
        <div className={`space-y-4 ${className}`}>
          {items.map((i) => (
            <div key={i} className="rounded-lg border p-4">
              <Skeleton className="mb-2 h-6 w-1/2" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      )

    case 'table':
      return (
        <div className={`space-y-2 ${className}`}>
          {items.map((i) => (
            <div key={i} className="flex items-center space-x-4 p-2">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/5" />
            </div>
          ))}
        </div>
      )

    default:
      return null
  }
}
