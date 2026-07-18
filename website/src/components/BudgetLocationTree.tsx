'use client'

import { EntityBadge, FoundationalTag } from '@/components/EntityBadge'
import { sectionLabel } from '@/components/table/BudgetStreamTree'
import { Badge } from '@/components/ui/badge'
import { BUDGET_STREAM_LABELS } from '@/lib/filter-constants'
import { isFoundational } from '@/lib/foundational'
import type { BudgetEntityNode, BudgetPartNode, BudgetStream } from '@/types'
import Link from 'next/link'

/**
 * Where a document sits in the budget — the detail page's "group by budget
 * location" view. Deliberately its own presentation (Part › Section › entity
 * badges › subprogramme pills), distinct from the table's column-filter tree;
 * both are driven by the same `BudgetStream[]` structure (getBudgetHierarchy,
 * here scoped to this one document). A document is usually cited from a single
 * stream, so this normally shows one budget branch.
 */

export function BudgetLocationTree({
  streams,
  foundationalEntities = [],
}: {
  streams: BudgetStream[]
  foundationalEntities?: string[]
}) {
  return (
    <div className="space-y-3 text-xs">
      {streams.map((stream) => {
        if (stream.type === 'ppb') {
          // The regular budget: render parts directly, matching the long-standing
          // Part › Section › Entity › Subprogramme layout.
          return stream.parts.map((part) => (
            <PartBlock
              key={part.part}
              part={part}
              foundationalEntities={foundationalEntities}
            />
          ))
        }

        if (stream.type === 'pko') {
          return (
            <div key={stream.type} className="space-y-1">
              <span className="block font-medium">
                {BUDGET_STREAM_LABELS.pko}
              </span>
              {stream.groups.map((group) => (
                <div key={group.group} className="space-y-1 pl-4">
                  <span className="block text-muted-foreground">
                    {group.label}
                  </span>
                  {group.entities.map((entity) => (
                    <div key={entity.entity} className="pl-4">
                      <EntityRow
                        entity={entity}
                        foundationalEntities={foundationalEntities}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )
        }

        // plan_outline — a leaf.
        return (
          <Link
            key={stream.type}
            href="/secretariat?budget_document=plan_outline"
            className="block font-medium hover:text-un-blue hover:underline"
          >
            {stream.label}
          </Link>
        )
      })}
    </div>
  )
}

function PartBlock({
  part,
  foundationalEntities,
}: {
  part: BudgetPartNode
  foundationalEntities: string[]
}) {
  return (
    <div className="space-y-1">
      <a
        href={`/secretariat?budget_part=${encodeURIComponent(part.part)}`}
        className="block font-medium hover:text-un-blue hover:underline"
      >
        Part {part.part}. {part.part_title}
      </a>

      {part.sections.map((section) => (
        <div key={section.section} className="space-y-1 pl-4">
          <a
            href={`/secretariat?section=${encodeURIComponent(section.section)}`}
            className="block text-muted-foreground hover:text-un-blue hover:underline"
          >
            {sectionLabel(section)}
          </a>

          {section.entities.map((entity) => (
            <div key={entity.entity} className="pl-4">
              <EntityRow
                entity={entity}
                foundationalEntities={foundationalEntities}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function EntityRow({
  entity,
  foundationalEntities,
}: {
  entity: BudgetEntityNode
  foundationalEntities: string[]
}) {
  const foundational = isFoundational(entity.entity, foundationalEntities)

  return (
    <>
      <div className="flex items-center gap-2">
        <EntityBadge
          entity={entity.entity}
          entityLong={entity.entity_long}
          foundational={foundational}
          onClick={() => {
            window.location.href = `/secretariat?entity=${encodeURIComponent(entity.entity)}`
          }}
        />
        {entity.entity_long && (
          <span
            className="truncate text-muted-foreground"
            title={entity.entity_long}
          >
            {entity.entity_long}
          </span>
        )}
        {foundational && <FoundationalTag />}
      </div>

      {entity.subprogrammes.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1 pl-4">
          {entity.subprogrammes.map((sp) => (
            <Badge
              key={sp.subprogramme}
              variant="secondary"
              className="cursor-pointer border-0 px-2 py-0.5 text-[11px] font-normal transition-colors hover:bg-secondary/80"
              onClick={() => {
                window.location.href = `/secretariat?subprogramme=${encodeURIComponent(sp.subprogramme)}`
              }}
            >
              {sp.subprogramme}
            </Badge>
          ))}
        </div>
      )}
    </>
  )
}
