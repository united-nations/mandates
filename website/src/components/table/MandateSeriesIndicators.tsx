'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Mandate } from '@/types'
import { ChevronDown, ChevronUp, History, Layers } from 'lucide-react'
import { getMandateUrl } from './MandateColumns'

/**
 * Grouped-mode expander at the left edge of a series representative row:
 * a circled member count with a chevron, no text. The tooltip carries the
 * two-tier vocabulary — collections say "related", never "versions".
 */
export function GroupBadge({
  mandate,
  expanded,
  onToggle,
}: {
  mandate: Mandate
  expanded: boolean
  onToggle: () => void
}) {
  const group = mandate.group
  if (!group || group.size <= 1) return null

  const isCollection = mandate.series?.is_collection
  const tooltip = isCollection
    ? `${group.size} related resolutions in this group`
    : `${group.size} versions${
        group.min_year && group.min_year !== group.max_year
          ? ` since ${group.min_year}`
          : ''
      }`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          className="inline-flex h-5 items-center justify-center gap-px rounded-full border border-gray-300 bg-white px-1 text-[10px] font-medium text-gray-600 transition-colors hover:border-un-blue hover:text-un-blue"
          aria-expanded={expanded}
          aria-label={tooltip}
        >
          {expanded ? (
            <ChevronUp className="h-2.5 w-2.5" />
          ) : (
            <ChevronDown className="h-2.5 w-2.5" />
          )}
          {group.size}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Ungrouped-mode markers next to the symbol: a History link on rows with a
 * named successor, a quiet Layers icon on collection members.
 */
export function SeriesMarkers({ mandate }: { mandate: Mandate }) {
  const series = mandate.series
  if (!series) return null

  if (series.superseded_by) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={getMandateUrl(series.superseded_by)}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex align-middle text-gray-400 transition-colors hover:text-un-blue"
            aria-label={`Superseded by ${series.superseded_by}`}
          >
            <History className="h-3.5 w-3.5" />
          </a>
        </TooltipTrigger>
        <TooltipContent>
          <p>Superseded by {series.superseded_by}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  if (series.is_collection) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex align-middle text-gray-300">
            <Layers className="h-3.5 w-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            Part of a group of {series.series_count} related resolutions
            {series.has_newer ? ' (newer ones exist)' : ''}
          </p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return null
}

/** Row content for one expanded group member (shared table/list markup). */
export function GroupMemberLine({
  member,
}: {
  member: NonNullable<Mandate['group']>['members'][number]
}) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="w-10 shrink-0 text-xs text-muted-foreground">
        {member.year ?? '—'}
      </span>
      <span className="w-36 shrink-0 truncate font-mono text-xs font-medium text-un-blue">
        {member.symbol}
      </span>
      <span className="min-w-0 truncate text-xs text-muted-foreground">
        {member.title}
      </span>
    </span>
  )
}
