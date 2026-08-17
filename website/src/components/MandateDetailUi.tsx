'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ExternalLink, FileText } from 'lucide-react'
import { DocumentSymbol } from '@/components/DocumentSymbol'
import { Chip, type ChipTone } from '@/components/ui/chip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
 * Secondary text under a section comes in two kinds, each with its own mark:
 * `DetailDisclaimer` (an always-visible `i` line — how the content was made
 * and how far to trust it) and the `?` a heading declares via `howTo` (what
 * the section offers and how to work it, off the page until asked for). A
 * plain `DetailFootnote` is for lines that are neither.
 *
 * Style follows the UN Transparency Portal: uppercase non-bold headings,
 * borders rather than shadows, un-blue as an accent only.
 */

export function DetailSectionHeading({
  children,
  hint,
  howTo,
}: {
  children: ReactNode
  hint?: ReactNode
  /**
   * How-to-use text for the section, revealed behind a small `?` beside the
   * heading. A plain string on purpose: the panel opens on hover, so nothing
   * inside it can be clicked — a link in here would be unreachable. The moment
   * a panel genuinely needs a link, it stops being this affordance and becomes
   * a full Popover with click-only semantics.
   */
  howTo?: string
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 className="text-lg font-normal tracking-wider text-gray-900 uppercase">
        {children}
      </h2>
      {hint && <span className="text-sm text-gray-500">{hint}</span>}
      {howTo && <DetailHowTo>{howTo}</DetailHowTo>}
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

/**
 * Footnote under a section: a plain visible line — a legend, a definition, a
 * status note. Anything that is a *disclaimer* (the content was produced by a
 * process that can be wrong in ways the reader cannot see) goes through
 * `DetailDisclaimer` instead, so the two kinds of secondary text stay
 * distinguishable at a glance.
 */
export function DetailFootnote({ children }: { children: ReactNode }) {
  return <p className="text-xs text-gray-500">{children}</p>
}

/**
 * A disclaimer line: an `i` roundel followed by the text it marks, always
 * visible — the `i` is a kind marker, not a control. Nothing opens or toggles.
 *
 * The marker always begins its own line, and that rule is structural: this
 * component renders a block and emits the roundel itself, so a call site
 * cannot place an `i` mid-line even by trying. Do not export the roundel
 * separately and do not add a prop that suppresses the block display — the
 * binding of marker to text is positional, and it survives only as long as
 * the marker has no independent existence.
 *
 * Glyph geometry: 14px circle, serif italic `i`, centred on the cap-height
 * midpoint of the first text line via `overflow-hidden` + `align-[-3px]`
 * (the inline-block's baseline becomes its bottom margin edge, so the
 * vertical-align length positions the circle deterministically). That trick
 * is span-specific — a `<button>` keeps its content baseline under
 * `overflow: hidden` and lands ~4.3px away with identical classes.
 */
export function DetailDisclaimer({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs text-gray-500">
      <span
        aria-hidden
        className="mr-1 inline-block h-3.5 w-3.5 overflow-hidden rounded-full border border-gray-300 text-center align-[-3px] font-serif text-[9px] leading-3 text-gray-500 italic select-none"
      >
        i
      </span>
      {children}
    </p>
  )
}

/** How long a hover lingers before the `?` panel opens or closes. The open
 * delay filters drive-by transits; the close grace lets the pointer cross the
 * gap between button and panel without the panel vanishing underneath it. */
const HOW_TO_HOVER_DELAY_MS = 150

/**
 * The `?` beside a section heading: how-to-use text, off the page until asked
 * for. Not exported — a `?` exists only where a `DetailSectionHeading`
 * declares `howTo`, so it cannot be scattered onto arbitrary elements.
 *
 * Ruled behaviour: opens on hover, click, or keyboard focus; closes on
 * pointer leave, outside click, or Escape with focus returning to the button.
 * All three closes matter — pointer leave does not exist on touch, so a panel
 * built to close only that way traps a touch reader.
 *
 * The primitive is a Radix Popover styled to read as a tooltip, not a Radix
 * Tooltip. Verified against the installed @radix-ui/react-tooltip source:
 * its trigger ignores touch pointers entirely (`onPointerMove` returns on
 * `pointerType === 'touch'`), its `onClick` *closes*, and `onFocus` is
 * suppressed during pointer interaction — so a tap can never open it and a
 * click actively dismisses it, failing two of the ruled opens. Popover's
 * trigger click toggles, which is what makes the panel reachable on touch;
 * hover and focus opens are added by hand below.
 */
function DetailHowTo({ children }: { children: string }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const openTimerRef = useRef<number | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  // A click fires focus before it fires click; without this guard the focus
  // handler would open the panel and the click would immediately toggle it
  // shut, making a click on the closed button a net no-op.
  const pointerDownRef = useRef(false)
  // Escape returns focus to the button; that programmatic focus must not
  // re-open the panel it just closed.
  const suppressFocusOpenRef = useRef(false)

  const cancelTimers = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }
  useEffect(() => cancelTimers, [])

  // Hover handling ignores touch pointers throughout: a tap synthesises
  // pointerenter before the click and pointerleave when the finger lifts, so
  // without the guard a tap-opened panel would close itself immediately.
  const hoverOpen = (event: React.PointerEvent) => {
    if (event.pointerType === 'touch') return
    cancelTimers()
    openTimerRef.current = window.setTimeout(
      () => setOpen(true),
      HOW_TO_HOVER_DELAY_MS
    )
  }
  const hoverClose = (event: React.PointerEvent) => {
    if (event.pointerType === 'touch') return
    cancelTimers()
    closeTimerRef.current = window.setTimeout(
      () => setOpen(false),
      HOW_TO_HOVER_DELAY_MS
    )
  }
  const hoverKeepOpen = (event: React.PointerEvent) => {
    if (event.pointerType === 'touch') return
    cancelTimers()
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        cancelTimers()
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label="How to use this section"
          // Baseline-aligned in the heading row; the top nudge lands the
          // circle's centre on the cap-height midpoint (a button keeps its
          // content baseline under overflow-hidden, unlike a span, so its
          // nudge differs from DetailDisclaimer's align value).
          className="relative -top-[2.33px] inline-block h-4 w-4 shrink-0 cursor-pointer self-baseline overflow-hidden rounded-full border border-gray-300 p-0 text-center text-[10px] leading-[0.875rem] font-semibold text-gray-500 select-none hover:border-un-blue hover:text-un-blue focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-1 focus-visible:outline-none"
          onPointerEnter={hoverOpen}
          onPointerLeave={hoverClose}
          onPointerDown={() => {
            pointerDownRef.current = true
            document.addEventListener(
              'pointerup',
              () => {
                pointerDownRef.current = false
              },
              { once: true }
            )
          }}
          onFocus={() => {
            if (suppressFocusOpenRef.current) {
              suppressFocusOpenRef.current = false
              return
            }
            if (!pointerDownRef.current) {
              cancelTimers()
              setOpen(true)
            }
          }}
        >
          ?
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-80 max-w-[calc(100vw-2rem)] rounded-md border-gray-200 p-3 text-sm shadow-md"
        onPointerEnter={hoverKeepOpen}
        onPointerLeave={hoverClose}
        // Focus stays on the button (or wherever it was) while the panel is
        // open — the panel holds nothing focusable, and moving focus into it
        // would turn every hover-open into a focus trap.
        onOpenAutoFocus={(event) => event.preventDefault()}
        // Radix would return focus to the trigger on *every* close; the ruled
        // behaviour ties focus return to Escape alone — an outside click puts
        // focus where the user clicked, which is what they asked for.
        onCloseAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={() => {
          const trigger = triggerRef.current
          if (trigger && document.activeElement !== trigger) {
            suppressFocusOpenRef.current = true
            trigger.focus()
          }
        }}
      >
        {children}
      </PopoverContent>
    </Popover>
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
    <header className={cn('border-b border-gray-200 pb-4', className)}>
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
