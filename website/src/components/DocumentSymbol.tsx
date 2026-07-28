import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A UN document symbol — "A/RES/79/1".
 *
 * Deliberately NOT a Chip. A symbol is not a facet you filter by, it is the
 * document's identifier, and it reads as a code rather than a label: square
 * corners, a blue ground, un-blue text. Keeping it visually distinct from the
 * pill vocabulary is the point — a reader scanning a list should be able to
 * tell "this is the document" from "this is something about the document"
 * without reading either.
 *
 * This is the treatment the table always had; it is now the treatment
 * everywhere a symbol appears — the table, the detail header, the version
 * history, the related-documents list and the expanded series rows — which
 * previously rendered it four different ways (blue block, mono chip, bare mono
 * text in un-blue, bare mono text in grey).
 */
export function DocumentSymbol({
  href,
  subdued,
  className,
  children,
  ...rest
}: {
  /** Renders a link. Omit for the plain identifier. */
  href?: string
  /** The document you are already on — present, but not somewhere to go. */
  subdued?: boolean
  className?: string
  children: ReactNode
  title?: string
  'aria-label'?: string
}) {
  const classes = cn(
    'inline-block rounded px-2 py-0.5 text-xs font-medium',
    subdued ? 'bg-gray-100 text-gray-700' : 'bg-blue-50 text-un-blue',
    href &&
      'transition-colors hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-1 focus-visible:outline-none',
    className
  )

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  )
}
