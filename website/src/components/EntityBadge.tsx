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
 * An entity chip that says whether this entity's citation is a foundational
 * one. The deeper blue is only a hint — colour alone is invisible to a good
 * share of readers and meaningless to anyone who was not told what it encodes —
 * so it always comes with the tooltip, and with an explicit tag wherever there
 * is room for one (see FoundationalTag).
 *
 * Must be rendered inside a TooltipProvider.
 */

interface EntityBadgeProps {
  entity: string
  entityLong?: string | null
  foundational?: boolean
  onClick?: () => void
  className?: string
}

export function EntityBadge({
  entity,
  entityLong,
  foundational = false,
  onClick,
  className = '',
}: EntityBadgeProps) {
  // `onClick` present ⇒ Chip renders a real <button>: focusable, with the
  // shared focus ring. It used to render through the shadcn Badge, i.e. a
  // <div>, which made the most-clicked pill in the table keyboard-unreachable.
  const chip = (
    <Chip
      kind="entity"
      density="dense"
      tone={foundational ? 'emphasis' : 'neutral'}
      onClick={onClick}
      className={cn('shrink-0 whitespace-nowrap', className)}
    >
      {entity}
    </Chip>
  )

  const description = entityLong && entityLong !== entity ? entityLong : null

  const content =
    !description && !foundational ? (
      chip
    ) : (
      <Tooltip>
        <TooltipTrigger asChild>{chip}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {description && <p>{description}</p>}
          {foundational && (
            <p className={description ? 'mt-1' : ''}>{FOUNDATIONAL_TOOLTIP}</p>
          )}
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

/** The explicit tag, for places with room to spell it out. */
export function FoundationalTag() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Chip
          density="dense"
          tone="emphasis"
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
