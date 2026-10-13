'use client'

import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { panelView } from '@/lib/directory-panel-view'
import type { PanelProgress } from '@/lib/directory-panel-view'
import { cn } from '@/lib/utils'

type PanelStatusProps = PanelProgress & { children: React.ReactNode }

/**
 * Shows an honest loading or failure state around lazy directory content.
 *
 * Stale content is dimmed rather than replaced, which keeps the reader's place
 * and the dialog's height, and the dim is the one the mandate table already
 * uses while a filter is being applied. panelView owns which of the three it
 * is; this renders them.
 */
export const PanelStatus = (props: PanelStatusProps) => {
  const view = panelView(props)
  if (view.show === 'error')
    return (
      <p role="alert" className="text-sm text-red-700">
        Directory data could not be loaded. Close this panel and try again.
      </p>
    )
  if (view.show === 'skeleton')
    return <LoadingSkeleton variant="list" count={4} />
  return (
    <div
      className={cn(
        'transition-opacity duration-150',
        view.stale ? 'opacity-50' : 'opacity-100'
      )}
    >
      {props.children}
    </div>
  )
}
