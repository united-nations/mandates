'use client'

import { Chip } from '@/components/ui/chip'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { FOUNDATIONAL_LABEL, FOUNDATIONAL_TOOLTIP } from '@/lib/foundational'
import { cn } from '@/lib/utils'

/**
 * An entity chip: the acronym, with the long name in a tooltip.
 *
 * It used to render "Mandates and background" citations in the emphasis tone
 * (deeper blue) wherever it appeared. That went first from here, on the
 * grounds that the split is a 2020 formatting decision inside the fascicle
 * (see lib/foundational.ts), not a hierarchy of importance, and a colour the
 * reader meets in a dense table with no legend asserts exactly that hierarchy.
 * It was kept on the mandate detail sidebar, the one surface with room to
 * legend it, and has since gone from there too
 * (MARK_FOUNDATIONAL_CHIPS_ON_DETAIL_PAGE): the legend explains the dot while
 * the colour does its own work on the reader, so legending it did not save
 * it. No entity chip anywhere renders the emphasis tone now.
 *
 * The `foundational` prop is kept — call sites still pass it and the data is
 * still true — but it no longer changes how the chip looks or reads.
 *
 * Must be rendered inside a TooltipProvider.
 */

interface EntityBadgeProps {
  entity: string
  entityLong?: string | null
  /**
   * Retained for call-site compatibility and deliberately unused: emphasis on
   * this distinction lives only in the detail sidebar now.
   */
  foundational?: boolean
  onClick?: () => void
  /**
   * Let the chip shrink and ellipsize instead of holding its full width.
   * For the fixed-width table cells: a badge that will not yield pushes the
   * "+N" overflow count out of the cell, and a clipped count reads as a
   * smaller number rather than as a truncation.
   */
  truncate?: boolean
  className?: string
}

export function EntityBadge({
  entity,
  entityLong,
  onClick,
  truncate,
  className = '',
}: EntityBadgeProps) {
  // `onClick` present ⇒ Chip renders a real <button>: focusable, with the
  // shared focus ring. It used to render through the shadcn Badge, i.e. a
  // <div>, which made the most-clicked pill in the table keyboard-unreachable.
  const chip = (
    <Chip
      density="dense"
      onClick={onClick}
      truncate={truncate}
      className={cn(
        truncate ? 'shrink' : 'shrink-0 whitespace-nowrap',
        className
      )}
    >
      {entity}
    </Chip>
  )

  const description = entityLong && entityLong !== entity ? entityLong : null

  const content = !description ? (
    chip
  ) : (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>{description}</p>
      </TooltipContent>
    </Tooltip>
  )

  if (!onClick) return content

  // These chips sit inside table rows that navigate on click, so the click has
  // to be stopped or filtering by an entity would also open the mandate. Now
  // that the chip is a <button>, Enter/Space dispatch a click as well, which
  // would otherwise both filter AND navigate — the stop covers both paths.
  // It lives on a `display:contents` wrapper (no box, no layout effect) rather
  // than on the chip, because Chip's onClick is deliberately event-free and
  // the chip itself must stay the direct child of TooltipTrigger asChild so
  // Radix's trigger props land on the focusable element.
  return (
    <span className="contents" onClick={(event) => event.stopPropagation()}>
      {content}
    </span>
  )
}

/**
 * The explicit tag, for the two places outside the sidebar that spell the
 * distinction out (the table's entity popup and the budget tree).
 *
 * Neutral tone, not emphasis: it states *where* in the fascicle the citation
 * sits and claims nothing about its weight. The un-blue-deep tint and the dot
 * that once carried the same fact on the detail sidebar are off
 * (MARK_FOUNDATIONAL_CHIPS_ON_DETAIL_PAGE), so every surface that still names
 * the distinction now names it in words. That is why this is the form that
 * survived.
 */
export function FoundationalTag() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Chip
          density="dense"
          truncate
          className="max-w-[13rem] shrink cursor-help"
        >
          {FOUNDATIONAL_LABEL}
        </Chip>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {FOUNDATIONAL_TOOLTIP}
      </TooltipContent>
    </Tooltip>
  )
}
