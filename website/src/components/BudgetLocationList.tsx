'use client'

import { Badge } from '@/components/ui/badge'
import type { BudgetLocation } from '@/types'
import { useState } from 'react'

/**
 * Where a document sits in the budget, grouped by the citing entity.
 *
 * Entity-led rather than part-led because the entity is the unit readers reason
 * about, and because the path above it is fully determined by it: no entity
 * spans more than one section, and every section has exactly one programme. So
 * each entity appears once, with its budget path as context and the
 * subprogrammes it cited the document under as chips.
 *
 * The median document has a single citation, so this is usually one row; the
 * tail reaches ~25 entities, hence the "show more".
 */

const VISIBLE = 5

interface EntityGroup {
  entity: string | null
  entity_long: string | null
  location: BudgetLocation
  subprogrammes: string[]
}

export function BudgetLocationList({
  locations,
}: {
  locations: BudgetLocation[]
}) {
  const [showAll, setShowAll] = useState(false)

  const groups = groupByEntity(locations)
  const shown = showAll ? groups : groups.slice(0, VISIBLE)

  return (
    <div className="space-y-3 text-xs">
      {shown.map((group) => (
        <div key={group.entity ?? group.location.section} className="space-y-1">
          <div className="flex items-center gap-2">
            {group.entity && (
              <Badge
                variant="secondary"
                className="shrink-0 cursor-pointer border-0 bg-un-blue! px-2.5 py-0.5 text-xs text-white! transition-colors hover:bg-un-blue/90!"
                onClick={() => {
                  window.location.href = `/?entity=${encodeURIComponent(group.entity!)}`
                }}
              >
                {group.entity}
              </Badge>
            )}
            {group.entity_long && (
              <span
                className="truncate text-muted-foreground"
                title={group.entity_long}
              >
                {group.entity_long}
              </span>
            )}
          </div>

          <BudgetPath location={group.location} />

          {group.subprogrammes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {group.subprogrammes.map((subprogramme) => (
                <Badge
                  key={subprogramme}
                  variant="secondary"
                  className="cursor-pointer border-0 px-2 py-0.5 text-[11px] font-normal transition-colors hover:bg-secondary/80"
                  onClick={() => {
                    window.location.href = `/?subprogramme=${encodeURIComponent(subprogramme)}`
                  }}
                >
                  {subprogramme}
                </Badge>
              ))}
            </div>
          )}
        </div>
      ))}

      {groups.length > VISIBLE && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="inline-block text-left text-sm text-un-blue hover:text-un-blue/80"
        >
          {showAll ? 'Show less' : `Show ${groups.length - VISIBLE} more`}
        </button>
      )}
    </div>
  )
}

/**
 * "Part IV › Section 9 · Programme 7 — Economic and social affairs". The two
 * titles are identical for most sections, so the programme title is only spelled
 * out where it genuinely differs from the section's.
 */
function BudgetPath({ location }: { location: BudgetLocation }) {
  const sameTitle =
    location.programme_title !== null &&
    location.programme_title.toLowerCase() ===
      location.section_title.toLowerCase()

  return (
    <div className="text-muted-foreground">
      <a
        href={`/?budget_part=${encodeURIComponent(location.part)}`}
        className="hover:text-un-blue hover:underline"
      >
        Part {location.part}
      </a>
      <span className="mx-1 text-muted-foreground/50">›</span>
      <a
        href={`/?section=${encodeURIComponent(location.section)}`}
        className="hover:text-un-blue hover:underline"
      >
        Section {location.section}
        {location.programme !== null && ` · Programme ${location.programme}`} —{' '}
        {location.section_title}
        {location.programme_title &&
          !sameTitle &&
          ` / ${location.programme_title}`}
      </a>
    </div>
  )
}

/**
 * One row per citing entity. The path is taken from the entity's first location
 * because every location of a given entity shares it — only the subprogramme
 * varies, which is exactly what gets collected into the chips.
 */
function groupByEntity(locations: BudgetLocation[]): EntityGroup[] {
  const groups = new Map<string, EntityGroup>()

  for (const location of locations) {
    const key = location.entity ?? `§${location.section}`
    const group = groups.get(key)

    if (!group) {
      groups.set(key, {
        entity: location.entity,
        entity_long: location.entity_long,
        location,
        subprogrammes: location.subprogramme ? [location.subprogramme] : [],
      })
    } else if (
      location.subprogramme &&
      !group.subprogrammes.includes(location.subprogramme)
    ) {
      group.subprogrammes.push(location.subprogramme)
    }
  }

  return [...groups.values()]
}
