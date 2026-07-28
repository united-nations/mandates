import type { ReactNode } from 'react'
import { ExternalLink, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The shared primitives of the mandate detail view: the section headings, the
 * chip, and the subject-label formatter.
 *
 * The detail view is organised as questions — who created this mandate, how has
 * it changed, who implements it, what it is about — each introduced by a
 * `DetailSectionHeading`. Anything genuinely *inside* one of those answers (the
 * related-documents list under "What is this mandate about?") gets a
 * `DetailSubsectionHeading`, so the visual weight of a heading always tells the
 * truth about the nesting.
 *
 * Everything selectable inside a section is a chip, and every chip is a real
 * link into the filtered explorer, so the sidebar reads as a sentence and works
 * as navigation. Kept here so the sections cannot drift apart.
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

/** A heading for a block nested inside one of the questions. */
export function DetailSubsectionHeading({
  children,
  hint,
}: {
  children: ReactNode
  hint?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h3 className="text-sm font-normal tracking-wide text-gray-600 uppercase">
        {children}
      </h3>
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </div>
  )
}

/**
 * Chip geometry. The vertical padding is viewport-dependent on purpose: at the
 * desktop density a chip is 22px tall, which is far below the 44px touch target
 * a finger needs, so small viewports get a 36px chip (and the entity chips —
 * the one interaction the copy actually asks the reader to perform — opt up to
 * 44px with CHIP_TOUCH_TARGET). Padding rather than min-height, so the label
 * stays vertically centred and the baseline maths in the sentence still works.
 */
export const CHIP_BASE =
  'inline-flex items-baseline gap-1.5 rounded-full border px-2.5 py-[9px] text-xs transition-colors focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none sm:py-0.5'

/** Opt-in 44px touch target on small viewports. */
export const CHIP_TOUCH_TARGET = 'py-[13px] sm:py-0.5'

export const CHIP_TONES = {
  /** Ordinary metadata / topic chip. */
  default: 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100',
  /** A chip that carries extra meaning (a foundational citing entity). */
  accent:
    'border-un-blue-deep/30 bg-un-blue-deep/5 font-medium text-un-blue-deep hover:bg-un-blue-deep/10',
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

/**
 * The detail view's header, shared by the full page and the intercepting modal
 * so the two cannot drift.
 *
 * Deliberately quiet. It used to lead with a "Mandate Document" eyebrow and a
 * filled charcoal "View PDF" button — the only filled element in the sheet, and
 * so the heaviest thing on screen despite being a secondary action. Now the
 * title carries the weight and everything else is one meta line: the symbol as
 * a mono chip (matching how the table renders the same value) and the PDF as an
 * un-blue link, which is how every other action in this view is expressed.
 */
export function MandateDetailHeader({
  title,
  symbol,
  link,
  className,
}: {
  title: string
  symbol: string
  link: string | null
  className?: string
}) {
  return (
    <header className={cn('border-b border-gray-200 pb-4', className)}>
      <h1 className="text-xl leading-tight font-bold text-gray-900 md:text-2xl">
        {title}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 font-mono text-xs text-gray-700">
          {symbol}
        </span>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-un-blue hover:underline"
          >
            <FileText aria-hidden className="h-3.5 w-3.5" />
            View PDF
            <ExternalLink aria-hidden className="h-3 w-3" />
          </a>
        ) : (
          // A disabled dark button gave a dead control top billing and no
          // reason; a plain note says the same thing without the weight.
          <span className="text-sm text-gray-400">No PDF available</span>
        )}
      </div>
    </header>
  )
}

/**
 * Subject headings are title-cased upstream, so "UN" arrives as "Un". One copy,
 * used everywhere a heading is shown, because the same subject used to render
 * as "Coordination Within UN System" in one place and "Coordination Within Un
 * System" 300px further down the same screen.
 *
 * Display only — the filter value stays the raw heading the data indexes.
 */
export function formatSubjectLabel(subject: string): string {
  return subject.replace(/\bUn\b/g, 'UN')
}
