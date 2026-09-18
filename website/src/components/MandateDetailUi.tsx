'use client'

import { type ReactNode } from 'react'
import { ExternalLink, FileText } from 'lucide-react'
import { DocumentSymbol } from '@/components/DocumentSymbol'
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
 * Secondary text under a section comes in two kinds, each behind its own
 * mark beside the heading and off the page until asked for: the `?` a heading
 * declares via `howTo` (what the section offers and how to work it) and the
 * `i` it declares via `disclaimer` (how the content was made and how far to
 * trust it). Two marks rather than one panel, so a reader can tell a caveat
 * from an instruction before opening either. The disclaimer used to render
 * as its own always-visible `i` line, which read as more space and alarm
 * than a methodology note earns. A plain `DetailFootnote` is for a visible
 * line that is neither — a legend, a definition, a status note.
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
  disclaimer,
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
  /**
   * The section's disclaimer — how its content was derived and how far to
   * trust it — revealed behind a small `i` immediately right of the `?`, or
   * directly after the heading where there is no `?`. The same affordance as
   * `howTo`, under the same rule about interactive content; only the glyph
   * and the accessible name differ, so a caveat and an instruction stay
   * distinguishable before either is opened.
   */
  disclaimer?: ReactNode
}) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 className={typography.subTitle}>{children}</h2>
      {hint && <span className={typography.meta}>{hint}</span>}
      <HeadingMarks howTo={howTo} disclaimer={disclaimer} />
    </div>
  )
}

/** A heading for a block nested inside one of the questions. */
export function DetailSubsectionHeading({
  children,
  hint,
  howTo,
  disclaimer,
}: {
  children: ReactNode
  hint?: ReactNode
  /** Same affordance as `DetailSectionHeading`'s — see its `howTo` doc. */
  howTo?: ReactNode
  /** Same affordance as `DetailSectionHeading`'s — see its `disclaimer` doc. */
  disclaimer?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h3 className={cn(typography.eyebrow, "text-muted-foreground")}>{children}</h3>
      {hint && <span className={typography.caption}>{hint}</span>}
      <HeadingMarks howTo={howTo} disclaimer={disclaimer} />
    </div>
  )
}

/**
 * The `?` and the `i` a heading declares, as one flex item in the heading
 * row: they sit a little closer to each other than the row's own gap puts
 * the heading, the hint and them, so the pair reads as the heading's marks
 * rather than as two more items in the row. The `?` keeps its place in the
 * row whether or not an `i` follows it. Renders nothing when neither is
 * declared, so a heading with no marks has no empty item in its row.
 */
function HeadingMarks({
  howTo,
  disclaimer,
}: {
  howTo?: ReactNode
  disclaimer?: ReactNode
}) {
  if (!howTo && !disclaimer) return null
  return (
    <span className="inline-flex items-baseline gap-x-1.5">
      {howTo && <DetailHowTo>{howTo}</DetailHowTo>}
      {disclaimer && <DetailDisclaimer>{disclaimer}</DetailDisclaimer>}
    </span>
  )
}

/**
 * The geometry that used to live here (CHIP_BASE / CHIP_TOUCH_TARGET /
 * CHIP_TONES) is now `components/ui/chip.tsx`, which is the one place any
 * rounded label in the app gets its radius, padding, tone and focus ring. Read
 * that file's header before adding a variant here.
 */
/**
 * A link that filters the explorer, inline in the panel's opening sentence.
 * A plain anchor (not a router link) because the detail view is also served as
 * an intercepting modal over the list, where a full navigation is exactly the
 * intended behaviour.
 *
 * Not a `Chip` any more. Four of these sit inside one running sentence, and a
 * pill puts 12px text and a bordered grey ground inside 14px prose - the eye
 * reads the sentence as broken into fragments rather than as a sentence with
 * links in it. Colour and an underline on hover carry "this is a link", which
 * is all these ever meant.
 *
 * No size class at all: inheriting the surrounding size is the whole point,
 * and it keeps this component clear of the custom-font-size hazard `cn`
 * carries (see lib/utils.ts).
 *
 * The focus ring is written out rather than inherited, because `Chip`'s was
 * the only reason these were keyboard-visible and every other link in the
 * panel carries the same one.
 *
 * What this gives up: `Chip`'s `comfortable` density grew these to a 36px
 * touch target below the `sm` breakpoint, and an inline link does not. That
 * is a deliberate trade for the sentence reading as a sentence, not an
 * oversight - do not quietly pad it back.
 */
export function FilterChip({
  href,
  className,
  children,
  ...rest
}: {
  href?: string
  className?: string
  children: ReactNode
  title?: string
  'aria-label'?: string
}) {
  return (
    <a
      href={href}
      className={cn(
        'text-un-blue hover:underline focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-1 focus-visible:outline-none',
        className
      )}
      {...rest}
    >
      {children}
    </a>
  )
}

/**
 * Footnote under a section: a plain visible line — a legend, a definition, a
 * status note, never a disclaimer. A disclaimer belongs behind the heading's
 * `disclaimer` (the `i`) instead, so the two kinds of secondary text stay
 * distinguishable — one is always on the page, the other is off it until
 * asked for.
 */
export function DetailFootnote({ children }: { children: ReactNode }) {
  return <p className={typography.meta}>{children}</p>
}

/**
 * The two marks beside a heading, as one class string they share whole: a
 * 16px circle, a 10px semibold glyph on a 14px line, baseline-aligned in the
 * heading row with a top nudge that lands the circle's centre on the
 * cap-height midpoint (a button keeps its content baseline under
 * overflow-hidden, unlike a span, which is why this nudge is a plain top
 * offset rather than the vertical-align trick a span needs). The `?` and the
 * `i` differ in nothing but the glyph and the accessible name.
 *
 * Passed to the trigger as this string, never through `cn`: tailwind-merge
 * does not know `text-micro` as a size, reads it as a colour, and drops it in
 * favour of `text-gray-500` — which left both glyphs at the heading's 16px
 * inside a 16px circle.
 */
const headingMarkClassName =
  'relative -top-[2.33px] inline-block h-4 w-4 shrink-0 cursor-pointer self-baseline overflow-hidden rounded-full border border-gray-300 p-0 text-center text-micro leading-[0.875rem] font-semibold text-gray-500 select-none hover:border-un-blue hover:text-un-blue focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-1 focus-visible:outline-none'

/**
 * The `?` beside a section heading: how-to-use text, off the page until asked
 * for. Not exported — a `?` exists only where a `DetailSectionHeading` declares
 * `howTo`, so it cannot be scattered onto arbitrary elements.
 *
 * The open/close behaviour, and the reasoning behind it, live in
 * `DisclosurePopover`; what stays here is this affordance's glyph and its
 * label.
 */
function DetailHowTo({ children }: { children: ReactNode }) {
  return (
    <DisclosurePopover
      label="How to use this section"
      side="bottom"
      align="start"
      sideOffset={6}
      triggerClassName={headingMarkClassName}
      trigger="?"
    >
      {children}
    </DisclosurePopover>
  )
}

/**
 * The `i` beside a section heading: the disclaimer, off the page until asked
 * for. The same control as the `?` — same primitive, same hover, focus and
 * touch paths, same circle, face, size and colour — with only the glyph and
 * the accessible name different, so the two marks read as a pair and stay
 * distinguishable. (The mandating-bodies directory draws its `i` in a serif
 * italic; that is a different face from the `?`, so it is not reused here.)
 * Not exported, for the same reason `DetailHowTo` is not: an `i` exists only
 * where a heading declares `disclaimer`.
 *
 * The accessible name is the same on every instance: it names the kind of
 * text behind the mark, and the heading it sits beside is the previous thing
 * in reading order, so deriving the label from the heading would repeat what
 * a screen reader has just said.
 */
function DetailDisclaimer({ children }: { children: ReactNode }) {
  return (
    <DisclosurePopover
      label="How this content was derived"
      side="bottom"
      align="start"
      sideOffset={6}
      triggerClassName={headingMarkClassName}
      trigger="i"
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
