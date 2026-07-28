import type { ReactNode } from 'react'
import { ExternalLink, FileText } from 'lucide-react'
import { Chip, type ChipTone } from '@/components/ui/chip'
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
 * The geometry that used to live here (CHIP_BASE / CHIP_TOUCH_TARGET /
 * CHIP_TONES) is now `components/ui/chip.tsx`, which is the one place any
 * rounded label in the app gets its radius, padding, tone and focus ring. Read
 * that file's header before adding a variant here.
 */
export type FilterChipTone = 'default' | 'accent'

/** The sidebar's two tones, in the shared vocabulary. */
const FILTER_CHIP_TONE: Record<FilterChipTone, ChipTone> = {
  default: 'neutral',
  accent: 'emphasis',
}

/**
 * A chip that filters the explorer. Rendered as a plain anchor (not a router
 * link) because the detail view is also served as an intercepting modal over
 * the list, where a full navigation is exactly the intended behaviour.
 *
 * A thin wrapper over `Chip` rather than a second implementation: it exists
 * only to name the sidebar's default density and to keep `tone="accent"`
 * spelled the way this view's call sites already spell it.
 */
export function FilterChip({
  href,
  tone = 'default',
  className,
  children,
  ...rest
}: {
  href?: string
  tone?: FilterChipTone
  className?: string
  children: ReactNode
  title?: string
  'aria-label'?: string
}) {
  return (
    <Chip
      href={href}
      tone={FILTER_CHIP_TONE[tone]}
      density="comfortable"
      className={className}
      {...rest}
    >
      {children}
    </Chip>
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
        <Chip kind="symbol" density="dense">
          {symbol}
        </Chip>
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
