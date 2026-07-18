import { Skeleton } from '@/components/ui/skeleton'

export function HeaderStatsSkeleton() {
  return (
    <div className="flex w-full flex-col gap-2 sm:w-64">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-lg bg-un-blue/10 px-3 py-1.5"
        >
          <Skeleton className="size-4 shrink-0 rounded" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="ml-auto h-7 w-10" />
        </div>
      ))}
    </div>
  )
}
