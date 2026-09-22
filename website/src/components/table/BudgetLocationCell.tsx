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
 * Where a document is cited in the budget, on one line.
 *
 * Every path is prefixed with its stream (PPB / PKO / Plan Outline). Regular-
 * budget paths then read Part › Section › Entity › SP; peacekeeping paths read
 * just the mission entity; the Plan Outline has no sub-structure. The path is
 * deliberately terse (numbers, not titles) because the column shares a table
 * row — the full path is in the tooltip.
 *
 * One path is shown and a "+N" carries the rest, with the full list behind it
 * on hover — the shape the Entities column already uses for the same job. The
 * cell used to stack two paths and a "+N more" line, which made it the one
 * cell that could run a row to three lines while every other column held one,
 * so row height depended on which columns were switched on.
 *
 * Nothing in the path truncates. Every segment is an identifier — a part
 * number, a section number, an entity code — and an identifier cut short is
 * not a shorter identifier, it is a different one ("UN-OH…" says nothing).
 * So the segments hold their width, the count holds its width, and the column
 * is sized (MandateColumns) for the longest path the segment forms allow.
 * Should a path ever exceed that, it is the path that clips at its edge and
 * never the count: a clipped count reads as a smaller number, which cannot be
 * seen to be wrong.
 */

const STREAM_SHORT: Record<BudgetStreamType, string> = {
  ppb: 'PPB',
  pko: 'PKO',
  plan_outline: 'Plan Outline',
}

const STREAM_ORDER: BudgetStreamType[] = ['ppb', 'pko', 'plan_outline']

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
  const [first, ...rest] = orderLocations(locations, activeStream)

  return (
    <div className="flex items-baseline gap-1 overflow-hidden text-sm">
      <Tooltip>
        <TooltipTrigger asChild>
          {/* min-w-0 so this, not the count, is what yields when the row is
              over-full; overflow-hidden so what yields clips at its own edge
              instead of running under the count. */}
          <div className="flex min-w-0 items-baseline gap-1 overflow-hidden whitespace-nowrap">
            <CompactPath location={first} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-sm">
          <FullPath location={first} />
        </TooltipContent>
      </Tooltip>

      {rest.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="shrink-0 cursor-default text-muted-foreground">
              +{rest.length}
            </span>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-sm space-y-2">
            {rest.map((location) => (
              <FullPath key={locationKey(location)} location={location} />
            ))}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function Separator() {
  return <span className="shrink-0 text-muted-foreground">›</span>
}

/** The terse one-line path, stream-prefixed. */
function CompactPath({ location }: { location: BudgetLocation }) {
  const segments: React.ReactNode[] = [
    <span key="stream" className="shrink-0 font-mono text-foreground">
      {STREAM_SHORT[location.stream]}
    </span>,
  ]

  if (location.stream === 'ppb') {
    if (location.part)
      segments.push(
        <span key="part" className="shrink-0 font-mono text-foreground">
          {location.part}
        </span>
      )
    if (location.section)
      segments.push(
        <span
          key="section"
          className="shrink-0 font-mono text-foreground"
        >
          {location.section}
        </span>
      )
    if (location.entity)
      segments.push(
        <span key="entity" className="shrink-0 font-medium text-un-blue-text">
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
      <span key="entity" className="shrink-0 font-medium text-un-blue-text">
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
    <div className="space-y-0.5 text-sm">
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
