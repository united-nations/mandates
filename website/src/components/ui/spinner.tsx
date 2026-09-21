import { cn } from '@/lib/utils'

/**
 * The app's loading spinner: a UN-blue arc. It was written inline on the PBI
 * page; it is here so a second caller reuses that one rather than drawing its
 * own. LoadingSkeleton remains the right choice where there is a shape to
 * stand in for - this is for the case where the content is already on screen
 * and is being refreshed.
 */
export const Spinner = ({ className }: { className?: string }) => (
  <span
    aria-hidden="true"
    className={cn(
      'inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-b-2 border-un-blue',
      className
    )}
  />
)
