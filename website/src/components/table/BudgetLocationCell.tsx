'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useFilters } from '@/contexts/FilterContext'
import { BUDGET_STREAM_LABELS } from '@/lib/filter-constants'
import type { BudgetLocation, BudgetStreamType } from '@/types'

/**
 * Where a document is cited in the budget, one line per citation site.
 *
 * Every line is prefixed with its stream (PPB / PKO / Plan Outline). Regular-
 * budget lines then read Part › Section › Entity › SP; peacekeeping lines read
 * just the mission entity; the Plan Outline has no sub-structure. The line is
 * deliberately terse (numbers, not titles) because the column shares a table
 * row — the full path is in the tooltip. Only the first two are shown; the rest
 * collapse into a "+N" that reveals the full list on hover.
 */

const STREAM_SHORT: Record<BudgetStreamType, string> = {
  ppb: 'PPB',
  pko: 'PKO',
  plan_outline: 'Plan Outline',
}

const STREAM_ORDER: BudgetStreamType[] = ['ppb', 'pko', 'plan_outline']

const VISIBLE = 2

/**
 * When a stream is being filtered on, float its locations to the front so the
 * cell leads with what was filtered (e.g. filtering by Plan Outline shows the
 * Plan Outline line first); otherwise locations keep their default order (down
 * the budget: PPB, then PKO, then Plan Outline).
 */
function orderLocations(
  locations: BudgetLocation[],
  activeStream?: BudgetStreamType
): BudgetLocation[] {
  if (!activeStream || !STREAM_ORDER.includes(activeStream)) return locations
  return [
    ...locations.filter((location) => location.stream === activeStream),
    ...locations.filter((location) => location.stream !== activeStream),
  ]
}

export function BudgetLocationCell({
  locations,
}: {
  locations: BudgetLocation[]
}) {
  const { filters } = useFilters()

  if (locations.length === 0) return null

  const activeStream = filters.budget_document as BudgetStreamType | undefined
  const ordered = orderLocations(locations, activeStream)
  const shown = ordered.slice(0, VISIBLE)
  const overflow = ordered.slice(VISIBLE)

  return (
    <div className="space-y-0.5 text-xs">
      {shown.map((location) => (
        <Tooltip key={locationKey(location)}>
          <TooltipTrigger asChild>
            <div className="flex items-baseline gap-1 truncate">
              <CompactPath location={location} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-sm">
            <FullPath location={location} />
          </TooltipContent>
        </Tooltip>
      ))}

      {overflow.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-default text-muted-foreground">
              +{overflow.length} more
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-sm space-y-2">
            {overflow.map((location) => (
              <FullPath key={locationKey(location)} location={location} />
            ))}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function Separator() {
  return <span className="shrink-0 text-muted-foreground/50">›</span>
}

/** The terse one-line path, stream-prefixed. */
function CompactPath({ location }: { location: BudgetLocation }) {
  const segments: React.ReactNode[] = [
    <span key="stream" className="shrink-0 font-mono text-muted-foreground">
      {STREAM_SHORT[location.stream]}
    </span>,
  ]

  if (location.stream === 'ppb') {
    if (location.part)
      segments.push(
        <span key="part" className="shrink-0 font-mono text-muted-foreground">
          {location.part}
        </span>
      )
    if (location.section)
      segments.push(
        <span
          key="section"
          className="shrink-0 font-mono text-muted-foreground"
        >
          {location.section}
        </span>
      )
    if (location.entity)
      segments.push(
        <span key="entity" className="truncate font-medium text-un-blue">
          {location.entity}
        </span>
      )
    if (location.subprogramme_number !== null)
      segments.push(
        <span key="sp" className="shrink-0 text-muted-foreground">
          SP&nbsp;{location.subprogramme_number}
        </span>
      )
  } else if (location.stream === 'pko' && location.entity) {
    segments.push(
      <span key="entity" className="truncate font-medium text-un-blue">
        {location.entity}
      </span>
    )
  }

  return (
    <>
      {segments.map((segment, i) => (
        <span key={i} className="flex items-baseline gap-1">
          {i > 0 && <Separator />}
          {segment}
        </span>
      ))}
    </>
  )
}

function FullPath({ location }: { location: BudgetLocation }) {
  const sameTitle =
    location.programme_title !== null &&
    location.section_title !== null &&
    location.programme_title.toLowerCase() ===
      location.section_title.toLowerCase()

  return (
    <div className="space-y-0.5 text-xs">
      <div className="font-medium">{BUDGET_STREAM_LABELS[location.stream]}</div>

      {location.stream === 'ppb' && (
        <>
          {location.part && (
            <div>
              Part {location.part}
              {location.part_title && ` · ${location.part_title}`}
            </div>
          )}
          {location.section && (
            <div>
              Section {location.section}
              {location.programme !== null &&
                ` · Programme ${location.programme}`}
              {location.section_title && ` · ${location.section_title}`}
              {location.programme_title &&
                !sameTitle &&
                ` / ${location.programme_title}`}
            </div>
          )}
        </>
      )}

      {location.stream === 'pko' && (
        <div>{location.is_support ? 'Support account' : 'Mission'}</div>
      )}

      {location.entity && (
        <div className="font-medium">
          {location.entity}
          {location.entity_long && ` — ${location.entity_long}`}
        </div>
      )}
      {location.subprogramme && <div>{location.subprogramme}</div>}
    </div>
  )
}

function locationKey(location: BudgetLocation): string {
  return [
    location.stream,
    location.part,
    location.section,
    location.entity,
    location.subprogramme,
  ].join(' ')
}
