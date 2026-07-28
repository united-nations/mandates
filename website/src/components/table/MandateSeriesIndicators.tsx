'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Mandate } from '@/types'
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  History,
  Layers,
} from 'lucide-react'
import { DocumentSymbol } from '@/components/DocumentSymbol'
import { getMandateUrl } from './MandateColumns'

/**
 * Grouped-mode expander at the left edge of a series representative row:
 * a chevron with the circled member count beside it, no text. The tooltip carries the
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
          className="group/expander inline-flex items-center gap-0.5 rounded-full focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-1 focus-visible:outline-none"
          aria-expanded={expanded}
          aria-label={tooltip}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          {/* Deliberately NOT a Chip: paired with the chevron, the fixed circle
              is what says "this number is a control" rather than a label. Only
              the greys and the focus ring are shared. */}
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700 transition-colors group-hover/expander:border-un-blue group-hover/expander:bg-gray-100">
            {group.size > 99 ? '99+' : group.size}
          </span>
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
            aria-label={`Not the latest version — the latest is ${series.superseded_by}`}
          >
            <History className="h-3.5 w-3.5" />
          </a>
        </TooltipTrigger>
        <TooltipContent>
          <p>Not the latest version — the latest is {series.superseded_by}</p>
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

/**
 * True when an expanded group's inline member list is incomplete: the full
 * series has members outside the current table view (filtered out, or never
 * cited in the budget corpus), or the inline list hit its query cap. The
 * inline list shows group.members plus the representative row itself.
 */
export function groupHasHiddenVersions(mandate: Mandate): boolean {
  const group = mandate.group
  if (!group || group.size <= 1) return false
  const total = Math.max(mandate.series?.series_count ?? 0, group.size)
  return group.members.length + 1 < total
}

/**
 * Footer line under an expanded group explaining why the inline list may be
 * shorter than the detail page's full version history. Purely presentational;
 * the parent row handles navigation to the representative's detail page.
 */
export function GroupHiddenVersionsNote({ mandate }: { mandate: Mandate }) {
  const group = mandate.group
  if (!group) return null
  const total = Math.max(mandate.series?.series_count ?? 0, group.size)
  const shownCount = Math.min(group.members.length + 1, total)
  const isCollection = mandate.series?.is_collection
  return (
    <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
      <span className="truncate">
        Showing {shownCount} of {total}{' '}
        {isCollection ? 'related resolutions' : 'versions'} — only those in the
        current table view.
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 font-medium text-un-blue">
        See details for the full {isCollection ? 'list' : 'version history'}
        <ArrowRight className="h-3 w-3" />
      </span>
    </span>
  )
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
      <DocumentSymbol className="w-36 shrink-0 truncate">
        {member.symbol}
      </DocumentSymbol>
      <span className="min-w-0 truncate text-xs text-muted-foreground">
        {member.title}
      </span>
    </span>
  )
}
