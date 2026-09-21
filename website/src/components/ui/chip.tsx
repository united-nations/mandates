import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * THE CHIP SYSTEM
 * ===============
 * One primitive for every small rounded label in the app. Before this there
 * were 31 hand-rolled implementations: 5 border radii, 6 spellings of the text
 * size, 7 horizontal paddings, 11 border treatments, 17 fills, and 17 chips
 * with no focus state at all. The same entity rendered as a grey chip in the
 * sidebar, a white pill in the entities modal, a solid blue badge in the table
 * and bare text on /system.
 *
 * Two orthogonal axes. Pick one value from each; never hand-write classes.
 *
 * 1. DENSITY — where it lives. Chosen by the container, not the author.
 * 2. TONE — idle / emphasis / selected / ghost. Focus is always a ring and
 *    never means anything else.
 *
 * Ornament is passed in by the caller (ChipDot) rather than derived from a
 * `kind`. The axis is currently empty: the domain dot on subject chips went
 * with the document-symbol refactor, and the dot marking an entity that cites
 * a document in its "Mandates and background" narrative is behind
 * MARK_FOUNDATIONAL_CHIPS_ON_DETAIL_PAGE (lib/foundational.ts), which is off.
 * Document symbols left the system entirely (components/DocumentSymbol.tsx): a
 * symbol is an identifier, not a facet, and it reads as a code, so it keeps
 * square corners and a blue ground rather than becoming another pill.
 *
 * THE COLOUR BUDGET
 * -----------------
 * Ornament carries kind; colour carries emphasis. If every kind had its own hue
 * the page becomes confetti and un-blue stops reading as "interactive". So the
 * ground is neutral grey and one thing earns colour:
 *
 *   - `selected` (un-blue fill, white text) — the state of an active facet.
 *
 * `emphasis` (un-blue-deep tint, meant to pair with a dot) was the second, for
 * a document cited in an entity's "Mandates and background" narrative rather
 * than only its Legislative mandates table. It has no live call site: the one
 * surface that passed it is behind MARK_FOUNDATIONAL_CHIPS_ON_DETAIL_PAGE
 * (lib/foundational.ts), which is off. It had a second route in, through
 * FilterChip's `accent` tone in MandateDetailUi, which never had a call site
 * either; that route is gone with the mapping, since FilterChip is an inline
 * link now and not a chip at all. The tone is kept rather than deleted because
 * the hold is on marking that one distinction, not on the tone; deleting a
 * primitive is a separate decision from withdrawing its one use. Read it as
 * "currently spent on nothing", not as budget to spend: un-blue-deep sits a
 * shade off un-blue, and two shades of blue carry no meaning on their own.
 *
 * Domain hues are gone. They appeared as a 6px dot on subject chips until
 * document symbols stopped being pills, and no surface fetches domain codes to
 * colour one from any more. Nothing gets a fill except `selected`.
 *
 * THE RULES THAT FIX REAL BUGS
 * ----------------------------
 * - Selection is a FILL, never a ring. Rings are reserved for focus. Two
 *   components previously used `ring-2 ring-un-blue` for *selected* while the
 *   shared base used it for *focused*, so a keyboard user could not tell them
 *   apart.
 * - Interactivity is expressed by ELEMENT, not by styling. `href` renders an
 *   `<a>`, `onClick` a `<button>`, neither a `<span>` — and a static chip gets
 *   no hover, so nothing looks clickable that isn't. The old shadcn Badge
 *   rendered a `<div>`, which is why the most-clicked pill in the table was
 *   keyboard-unreachable and had no focus ring.
 * - `items-baseline`, not `items-center`. The sidebar sentence sets chips
 *   inline in running text; centring them breaks the baseline. Three of the old
 *   implementations "fixed" this to items-center, which is exactly why they did
 *   not line up with the chips beside them.
 * - Counts are a SLOT (`ChipCount`), not another chip. There were six different
 *   count treatments, one of them with no vertical padding at all.
 */

/** What the chip represents. Drives ornament and the default tone. */
export type ChipKind =
  | 'entity'
  | 'topic'
  | 'organ'
  | 'docType'
  | 'budget'
  | 'plain'

/**
 * Density is a property of the CONTAINER, not the chip.
 *
 * `comfortable` grows to a 36px touch target on small viewports; `touch` opts
 * all the way to 44px for chips that are the primary interaction of their
 * section. `dense` is unconditional — it must never grow, because these live in
 * table cells and compact lists where an extra 18px of padding on mobile would
 * change the height of every row.
 */
export type ChipDensity = 'comfortable' | 'dense' | 'touch'

/** Emphasis, not decoration. See the colour budget above. */
export type ChipTone = 'neutral' | 'emphasis' | 'selected' | 'ghost'

const DENSITY: Record<ChipDensity, string> = {
  comfortable: 'px-2.5 py-[9px] text-xs sm:py-0.5',
  touch: 'px-2.5 py-[13px] text-xs sm:py-0.5',
  dense: 'px-2 py-0.5 text-xs',
}

const TONE: Record<ChipTone, string> = {
  neutral: 'border-gray-200 bg-gray-50 text-gray-700',
  emphasis:
    'border-un-blue-deep/30 bg-un-blue-deep/5 font-medium text-un-blue-deep',
  selected: 'border-un-blue bg-un-blue font-medium text-white',
  ghost: 'border-dashed border-gray-300 bg-transparent text-gray-500',
}

/** Hover only exists for chips that actually do something. */
const TONE_HOVER: Record<ChipTone, string> = {
  neutral: 'hover:border-un-blue hover:bg-gray-100',
  emphasis: 'hover:bg-un-blue-deep/10',
  selected: 'hover:bg-un-blue-deep',
  ghost: 'hover:border-un-blue',
}

const BASE =
  'inline-flex items-baseline gap-1.5 rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-1 focus-visible:outline-none'

export interface ChipProps {
  density?: ChipDensity
  tone?: ChipTone
  /** Renders an <a>. */
  href?: string
  /**
   * Renders a <button> — unless `href` is also given, in which case the chip
   * stays a real link and the handler intercepts the click. That pair is the
   * directory pill: it must be openable in a new tab, but a plain click filters
   * in place instead of navigating (the call site calls `preventDefault`).
   */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void
  /** Constrain and ellipsize — required inside fixed-width table cells. */
  truncate?: boolean
  className?: string
  children: ReactNode
  title?: string
  'aria-label'?: string
}

export function Chip({
  density = 'comfortable',
  tone = 'neutral',
  href,
  onClick,
  truncate,
  className,
  children,
  ...rest
}: ChipProps) {
  const interactive = Boolean(href || onClick)
  const classes = cn(
    BASE,
    DENSITY[density],
    TONE[tone],
    // Tailwind v4's preflight leaves <button> on the UA's arrow cursor, so an
    // interactive chip has to ask for the pointer explicitly or half the chips
    // in the app read as static text.
    interactive ? cn(TONE_HOVER[tone], 'cursor-pointer') : 'cursor-default',
    // NOT `truncate` here: text-overflow applies to a block container, and a
    // Chip is inline-flex, so its text becomes an anonymous flex item and gets
    // CLIPPED WITH NO ELLIPSIS — the exact "Internati" / "Gender Equi" bug the
    // table used to have. The ellipsis has to live on a block child instead.
    truncate && 'min-w-0 max-w-full',
    className
  )

  // Truncation wraps the CONTENT, not the chip. A chip that truncates should
  // therefore not also carry a ChipCount — the count would ellipsize with the
  // label. Table chips are labels only, which is the case this serves.
  const body = truncate ? (
    <span className="min-w-0 truncate">{children}</span>
  ) : (
    children
  )

  if (href) {
    return (
      <a href={href} onClick={onClick} className={classes} {...rest}>
        {body}
      </a>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes} {...rest}>
        {body}
      </button>
    )
  }
  return (
    <span className={classes} {...rest}>
      {body}
    </span>
  )
}

/**
 * The count that sits inside a chip. One treatment, and it takes its colour
 * from the parent tone rather than being restated at every call site.
 */
export function ChipCount({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: ChipTone
}) {
  return (
    <span
      className={cn(
        'text-[10px] tabular-nums',
        tone === 'selected' ? 'text-white/80' : 'text-gray-500'
      )}
    >
      {children}
    </span>
  )
}

/**
 * The ornament that carries KIND.
 *
 * No consumer at present. A subject chip took a domain-coloured dot until the
 * domain hues left the system, and an entity cited in "Mandates and
 * background" took a solid un-blue-deep one until that marking went behind
 * MARK_FOUNDATIONAL_CHIPS_ON_DETAIL_PAGE (lib/foundational.ts), which is off.
 * Kept because withdrawing the one use is not a decision to drop the
 * primitive, and because the rule it carries is the part worth keeping: both
 * dots were unexplained on screen, so any surface that renders one must legend
 * it in its footnote.
 */
export function ChipDot({ color }: { color?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'size-1.5 self-center rounded-full',
        !color && 'bg-un-blue-deep'
      )}
      style={color ? { backgroundColor: color } : undefined}
    />
  )
}
