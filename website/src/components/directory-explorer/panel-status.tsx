'use client'

import { LoadingSkeleton } from '@/components/LoadingSkeleton'

interface PanelStatusProps {
  loading: boolean
  error: string | null
  children: React.ReactNode
}

/** Shows an honest loading or failure state around lazy directory content. */
export const PanelStatus = (props: PanelStatusProps) => {
  if (props.loading) return <LoadingSkeleton variant="list" count={4} />
  if (props.error)
    return (
      <p role="alert" className="text-sm text-red-700">
        Directory data could not be loaded. Close this panel and try again.
      </p>
    )
  return props.children
}
