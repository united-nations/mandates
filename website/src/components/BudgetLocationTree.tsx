'use client'

import { Badge } from '@/components/ui/badge'
import type { BudgetLocation } from '@/types'

/**
 * Where a document sits in the budget, as a tree — the same shape as the
 * Budget Location column's filter, pruned to this one document.
 *
 * Alternative presentation to BudgetLocationList (which is entity-led and flat).
 * Both are rendered on the detail page for now so the two can be compared.
 *
 * A document is usually cited once, in which case this collapses to a single
 * three-line branch. The value shows up in the tail: a document cited by 25
 * entities across 22 sections becomes a handful of part groups rather than 25
 * repetitive rows.
 */

interface SubprogrammeLeaf {
  label: string
  number: number | null
}

interface EntityNode {
  entity: string | null
  entity_long: string | null
  subprogrammes: SubprogrammeLeaf[]
}

interface SectionNode {
  section: string
  label: string
  entities: EntityNode[]
}

interface PartNode {
  part: string
  part_title: string
  sections: SectionNode[]
}

export function BudgetLocationTree({
  locations,
}: {
  locations: BudgetLocation[]
}) {
  const tree = buildTree(locations)

  return (
    <div className="space-y-3 text-xs">
      {tree.map((part) => (
        <div key={part.part} className="space-y-1">
          <a
            href={`/?budget_part=${encodeURIComponent(part.part)}`}
            className="block font-medium hover:text-un-blue hover:underline"
          >
            Part {part.part}. {part.part_title}
          </a>

          {part.sections.map((section) => (
            <div key={section.section} className="space-y-1 pl-4">
              <a
                href={`/?section=${encodeURIComponent(section.section)}`}
                className="block text-muted-foreground hover:text-un-blue hover:underline"
              >
                {section.label}
              </a>

              {section.entities.map((entity) => (
                <div key={entity.entity ?? section.section} className="pl-4">
                  <div className="flex items-center gap-2">
                    {entity.entity && (
                      <Badge
                        variant="secondary"
                        className="shrink-0 cursor-pointer border-0 bg-un-blue! px-2.5 py-0.5 text-xs text-white! transition-colors hover:bg-un-blue/90!"
                        onClick={() => {
                          window.location.href = `/?entity=${encodeURIComponent(entity.entity!)}`
                        }}
                      >
                        {entity.entity}
                      </Badge>
                    )}
                    {entity.entity_long && (
                      <span
                        className="truncate text-muted-foreground"
                        title={entity.entity_long}
                      >
                        {entity.entity_long}
                      </span>
                    )}
                  </div>

                  {entity.subprogrammes.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1 pl-4">
                      {entity.subprogrammes.map((subprogramme) => (
                        <Badge
                          key={subprogramme.label}
                          variant="secondary"
                          className="cursor-pointer border-0 px-2 py-0.5 text-[11px] font-normal transition-colors hover:bg-secondary/80"
                          onClick={() => {
                            window.location.href = `/?subprogramme=${encodeURIComponent(subprogramme.label)}`
                          }}
                        >
                          {subprogramme.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * "Section 9 · Programme 7 — Economic and social affairs". The section and
 * programme titles are identical for most sections, so the programme title is
 * only spelled out where it genuinely differs.
 */
function sectionLabel(location: BudgetLocation): string {
  const prefix =
    location.programme !== null
      ? `Section ${location.section} · Programme ${location.programme}`
      : `Section ${location.section}`

  const sameTitle =
    location.programme_title !== null &&
    location.programme_title.toLowerCase() ===
      location.section_title.toLowerCase()

  if (location.programme_title === null || sameTitle) {
    return `${prefix} — ${location.section_title}`
  }
  return `${prefix} — ${location.section_title} / ${location.programme_title}`
}

/**
 * Locations arrive already ordered down the budget, so appending to the last
 * matching node preserves that order without a second sort.
 */
function buildTree(locations: BudgetLocation[]): PartNode[] {
  const parts: PartNode[] = []

  for (const location of locations) {
    let part = parts.find((p) => p.part === location.part)
    if (!part) {
      part = {
        part: location.part,
        part_title: location.part_title,
        sections: [],
      }
      parts.push(part)
    }

    let section = part.sections.find((s) => s.section === location.section)
    if (!section) {
      section = {
        section: location.section,
        label: sectionLabel(location),
        entities: [],
      }
      part.sections.push(section)
    }

    let entity = section.entities.find((e) => e.entity === location.entity)
    if (!entity) {
      entity = {
        entity: location.entity,
        entity_long: location.entity_long,
        subprogrammes: [],
      }
      section.entities.push(entity)
    }

    if (
      location.subprogramme &&
      !entity.subprogrammes.some((s) => s.label === location.subprogramme)
    ) {
      entity.subprogrammes.push({
        label: location.subprogramme,
        number: location.subprogramme_number,
      })
    }
  }

  return parts
}
