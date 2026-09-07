'use client'

import { type ReactNode } from 'react'
import { ExternalLink, FileText } from 'lucide-react'
import { DocumentSymbol } from '@/components/DocumentSymbol'
import { Chip, type ChipTone } from '@/components/ui/chip'
import { DisclosurePopover } from '@/components/ui/disclosure-popover'
import { typography } from '@/lib/typography'
import { cn } from '@/lib/utils'

/**
 * The shared primitives of the mandate detail view: the section headings, the
 * chip, and the subject-label formatter.
 *
 * The detail view is organised as questions — who adopted this document and
 * its mandates, what other versions it has, who cites it in the budget, what
 * subjects it has, what is in it — each introduced by a
 * `DetailSectionHeading`. Anything genuinely *inside* one of those answers (the
 * related-documents list under "What subjects does this mandate have?") gets a
 * `DetailSubsectionHeading`, so the visual weight of a heading always tells the
 * truth about the nesting.
 *
 * Everything selectable inside a section is a chip, and every chip is a real
 * link into the filtered explorer, so the sidebar reads as a sentence and works
 * as navigation. Kept here so the sections cannot drift apart.
 *
 * Secondary text under a section comes in two kinds. A disclaimer — how the
 * content was made and how far to trust it — folds into the `?` a heading
 * declares via `howTo`, off the page until asked for; it used to render as
 * its own always-visible `i` line, which read as more space and alarm than
 * a methodology note earns. A plain `DetailFootnote` is for a visible line
 * that is not a disclaimer at all — a legend, a definition, a status note.
 *
 * Style: semibold sentence-case headings (the question strings are authored
 * in sentence case and rendered as written), borders rather than shadows,
 * un-blue as an accent only.
 */

/**
 * The section list's own rule-and-rhythm: a hairline between sections (one
 * rule, all sections — states the boundary before it is read) plus 24px of
 * padding on both sides of it (proximity — keeps each heading bound to its
 * own answer rather than floating between two).
 *
 * Both the full page and the modal wrap their section list in this — same
 * constant, not two hand-tuned copies. They drifted once already: the full
 * page had only `[&>*+*]:pt-12` with no matching `pb` and no last-child
 * reset, so every hairline sat flush against the content above it and then
 * left a lopsided gap before the next heading, while the modal's symmetric
 * version read as the more finished one.
 */
export const detailSectionListClassName =
  'divide-y divide-border [&>*]:pb-6 [&>*+*]:pt-6 [&>*:last-child]:pb-0 sm:pr-2'

export function DetailSectionHeading({
  children,
  hint,
  howTo,
}: {
  children: ReactNode
  hint?: ReactNode
  /**
   * How-to-use content for the section, revealed behind a small `?` beside
   * the heading — usually a plain sentence, but a static list is fine too
   * (the paragraphs section folds its search-syntax bullets in here). What it
   * must not carry is anything interactive: the panel opens on hover as well
   * as click, so a link or button inside it would fire on a passing pointer
   * rather than a deliberate action. The moment a section genuinely needs a
   * click-only link, it stops being this affordance and becomes a full
   * Popover instead.
   */
  howTo?: ReactNode
}) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 className={typography.subTitle}>{children}</h2>
      {hint && <span className={typography.meta}>{hint}</span>}
      {howTo && <DetailHowTo>{howTo}</DetailHowTo>}
    </div>
  )
}

/** A heading for a block nested inside one of the questions. */
export function DetailSubsectionHeading({
  children,
  hint,
  howTo,
}: {
  children: ReactNode
  hint?: ReactNode
  /** Same affordance as `DetailSectionHeading`'s — see its `howTo` doc. */
  howTo?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h3 className={cn(typography.eyebrow, "text-muted-foreground")}>{children}</h3>
      {hint && <span className={typography.caption}>{hint}</span>}
      {howTo && <DetailHowTo>{howTo}</DetailHowTo>}
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

/**
 * The sidebar's two tones, in the shared vocabulary. `accent` has never had a
 * call site - every FilterChip in the sidebar takes the default - so this row
 * is the second dead route into `emphasis`, alongside the entity chips' own,
 * which is now behind MARK_FOUNDATIONAL_CHIPS_ON_DETAIL_PAGE. Left as it is:
 * removing an unreachable mapping is tidying, and it would hide that the tone
 * has no consumer left at all.
 */
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

/**
 * Footnote under a section: a plain visible line — a legend, a definition, a
 * status note, never a disclaimer. A disclaimer belongs behind the heading's
 * `howTo` instead, so the two kinds of secondary text stay distinguishable —
 * one is always on the page, the other is off it until asked for.
 */
export function DetailFootnote({ children }: { children: ReactNode }) {
  return <p className={typography.meta}>{children}</p>
}

/**
 * The `?` beside a section heading: how-to-use text, off the page until asked
 * for. Not exported — a `?` exists only where a `DetailSectionHeading` declares
 * `howTo`, so it cannot be scattered onto arbitrary elements.
 *
 * The open/close behaviour, and the reasoning behind it, live in
 * `DisclosurePopover`; what stays here is this affordance's glyph, its label and
 * the geometry that lands it on a heading baseline.
 */
function DetailHowTo({ children }: { children: ReactNode }) {
  return (
    <DisclosurePopover
      label="How to use this section"
      side="bottom"
      align="start"
      sideOffset={6}
      // Baseline-aligned in the heading row; the top nudge lands the circle's
      // centre on the cap-height midpoint (a button keeps its content baseline
      // under overflow-hidden, unlike a span, which is why this nudge is a
      // plain top offset rather than the vertical-align trick a span needs).
      triggerClassName="relative -top-[2.33px] inline-block h-4 w-4 shrink-0 cursor-pointer self-baseline overflow-hidden rounded-full border border-gray-300 p-0 text-center text-micro leading-[0.875rem] font-semibold text-gray-500 select-none hover:border-un-blue hover:text-un-blue focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-1 focus-visible:outline-none"
      trigger="?"
    >
      {children}
    </DisclosurePopover>
  )
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
    <header className={cn('border-b border-border pb-4', className)}>
      <h1 className="text-xl leading-tight font-bold text-gray-900 md:text-2xl">
        {title}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <DocumentSymbol>{symbol}</DocumentSymbol>
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
          <span className="text-sm text-muted-foreground">No PDF available</span>
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
