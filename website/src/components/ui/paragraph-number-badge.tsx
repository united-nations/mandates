import type { ReactNode } from 'react'

/** Shared number treatment for resolution paragraphs and agenda items. */
export function ParagraphNumberBadge({ children }: { children: ReactNode }) {
  return (
    <span className="mt-0.5 flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-md bg-un-blue-text px-1.5 text-xs font-medium text-white tabular-nums">
      {children}
    </span>
  )
}
