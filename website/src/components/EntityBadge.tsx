'use client'

import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { FOUNDATIONAL_LABEL, FOUNDATIONAL_TOOLTIP } from '@/lib/foundational'

/**
 * An entity badge that says whether this entity's citation is a foundational
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
  /** `solid` on detail pages, `muted` in the denser table cells. */
  variant?: 'solid' | 'muted'
  className?: string
}

export function EntityBadge({
  entity,
  entityLong,
  foundational = false,
  onClick,
  variant = 'solid',
  className = '',
}: EntityBadgeProps) {
  const background = foundational
    ? 'bg-un-blue-deep! hover:bg-un-blue-deep/90!'
    : variant === 'muted'
      ? 'bg-un-blue/75! hover:bg-un-blue/60!'
      : 'bg-un-blue! hover:bg-un-blue/90!'

  const badge = (
    <Badge
      variant="secondary"
      className={`shrink-0 cursor-pointer border-0 text-xs whitespace-nowrap text-white! transition-colors ${background} ${className}`}
      onClick={(event) => {
        event.stopPropagation()
        onClick?.()
      }}
    >
      {entity}
    </Badge>
  )

  const description = entityLong && entityLong !== entity ? entityLong : null
  if (!description && !foundational) return badge

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {description && <p>{description}</p>}
        {foundational && (
          <p className={description ? 'mt-1' : ''}>{FOUNDATIONAL_TOOLTIP}</p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

/** The explicit tag, for places with room to spell it out. */
export function FoundationalTag() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="secondary"
          className="shrink-0 cursor-help border-0 bg-un-blue-deep/10! px-2 py-0.5 text-[11px] font-medium text-un-blue-deep! whitespace-nowrap"
        >
          {FOUNDATIONAL_LABEL}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {FOUNDATIONAL_TOOLTIP}
      </TooltipContent>
    </Tooltip>
  )
}
