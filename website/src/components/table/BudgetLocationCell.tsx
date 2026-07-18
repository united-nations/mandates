'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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

/** Minimum lines to show before collapsing into "+N more". */
const MIN_VISIBLE = 2

/**
 * Choose which lines to show. One representative per stream first — so PKO and
 * Plan Outline are never buried behind a long tail of PPB entities — then pad
 * with more locations up to MIN_VISIBLE. Locations arrive pre-sorted (PPB down
 * the budget, then PKO, then Plan Outline), so the representatives are the
 * first of each stream.
 */
function pickVisible(locations: BudgetLocation[]): BudgetLocation[] {
  const shown = STREAM_ORDER.map((stream) =>
    locations.find((location) => location.stream === stream)
  ).filter((location): location is BudgetLocation => location !== undefined)

  for (const location of locations) {
    if (shown.length >= MIN_VISIBLE) break
    if (!shown.includes(location)) shown.push(location)
  }
  return shown
}

export function BudgetLocationCell({
  locations,
}: {
  locations: BudgetLocation[]
}) {
  if (locations.length === 0) return null

  const shown = pickVisible(locations)
  const overflow = locations.filter((location) => !shown.includes(location))

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
