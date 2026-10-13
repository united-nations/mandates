import { Skeleton } from '@/components/ui/skeleton'

interface LoadingFallbackProps {
  variant?: 'simple' | 'mandate' | 'page'
  message?: string
}

export function LoadingFallback({
  variant = 'simple',
  message = 'Loading...',
}: LoadingFallbackProps) {
  if (variant === 'simple') {
    return <div />
  }

  if (variant === 'mandate') {
    return (
      <div className="pb-8">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (variant === 'page') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return <div>{message}</div>
}
