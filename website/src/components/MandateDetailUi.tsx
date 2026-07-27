import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * The two shared primitives of the mandate detail view: the section heading and
 * the chip.
 *
 * The detail view is organised as three questions — who created this mandate,
 * who implements it, what it is about — each introduced by one of these
 * headings. Everything selectable inside a section is a chip, and every chip is
 * a real link into the filtered explorer, so the sidebar reads as a sentence
 * and works as navigation. Kept here so the sections cannot drift apart.
 *
 * Style follows the UN Transparency Portal: uppercase non-bold headings,
 * borders rather than shadows, un-blue as an accent only.
 */

export function DetailSectionHeading({
  children,
  hint,
}: {
  children: ReactNode
  hint?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 className="text-lg font-normal tracking-wider text-gray-900 uppercase">
        {children}
      </h2>
      {hint && <span className="text-sm text-gray-500">{hint}</span>}
    </div>
  )
}

const CHIP_BASE =
  'inline-flex items-baseline gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors'

const CHIP_TONES = {
  /** Ordinary metadata / topic chip. */
  default: 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100',
  /** A chip that carries extra meaning (a foundational citing entity). */
  accent:
    'border-un-blue-deep/30 bg-un-blue-deep/5 text-un-blue-deep hover:bg-un-blue-deep/10',
} as const

export type ChipTone = keyof typeof CHIP_TONES

/**
 * A chip that filters the explorer. Rendered as a plain anchor (not a router
 * link) because the detail view is also served as an intercepting modal over
 * the list, where a full navigation is exactly the intended behaviour.
 */
export function FilterChip({
  href,
  tone = 'default',
  className,
  children,
  ...rest
}: {
  href?: string
  tone?: ChipTone
  className?: string
  children: ReactNode
  title?: string
  'aria-label'?: string
}) {
  const classes = cn(
    CHIP_BASE,
    CHIP_TONES[tone],
    href ? 'hover:border-un-blue' : 'cursor-default',
    className
  )
  if (!href) {
    return (
      <span className={classes} {...rest}>
        {children}
      </span>
    )
  }
  return (
    <a href={href} className={classes} {...rest}>
      {children}
    </a>
  )
}

/** Footnote under a section: provenance, caveats, "how to read this". */
export function DetailFootnote({ children }: { children: ReactNode }) {
  return <p className="text-xs text-gray-500">{children}</p>
}
