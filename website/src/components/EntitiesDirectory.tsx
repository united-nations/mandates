'use client'

import { SearchInput } from '@/components/SearchInput'
import { sectionLabel } from '@/components/table/BudgetStreamTree'
import { BUDGET_STREAM_LABELS } from '@/lib/filter-constants'
import type { BudgetEntityNode, BudgetStream } from '@/types'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

/**
 * The entity directory: every budget-holding entity as a card, grouped by the
 * budget hierarchy (Programme Budget → Part → Section, Peacekeeping → Missions /
 * Support account). Reads the same `BudgetStream[]` as the table's budget filter
 * (getBudgetHierarchy). Clicking a card opens the main list filtered to that
 * entity; the Plan Outline tile filters by its stream.
 */

interface EntitiesDirectoryProps {
  streams: BudgetStream[]
}

export function EntitiesDirectory({ streams }: EntitiesDirectoryProps) {
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()

  const matches = (entity: BudgetEntityNode) =>
    !term ||
    entity.entity.toLowerCase().includes(term) ||
    (entity.entity_long?.toLowerCase().includes(term) ?? false)

  const totalEntities = useMemo(() => countEntities(streams), [streams])

  return (
    <div className="space-y-8">
      <div className="max-w-md">
        <SearchInput
          placeholder="Search entities by acronym or name..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearch(e.target.value)
          }
          variant="border-bottom"
        />
      </div>

      {streams.map((stream) => {
        const key = stream.type

        if (stream.type === 'plan_outline') {
          if (term) return null
          return (
            <section key={key} className="space-y-3">
              <StreamHeading type={stream.type} />
              <Link
                href="/?budget_document=plan_outline"
                className="group flex max-w-md items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2.5 transition-colors hover:border-un-blue/40 hover:bg-accent"
              >
                <span className="text-sm">
                  {stream.label}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {stream.count} documents
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 group-hover:text-un-blue" />
              </Link>
            </section>
          )
        }

        if (stream.type === 'pko') {
          const groups = stream.groups
            .map((g) => ({ ...g, entities: g.entities.filter(matches) }))
            .filter((g) => g.entities.length > 0)
          if (groups.length === 0) return null
          return (
            <section key={key} className="space-y-4">
              <StreamHeading type={stream.type} />
              {groups.map((group) => (
                <div key={group.group} className="space-y-2">
                  <SubHeading>{group.label}</SubHeading>
                  <CardGrid entities={group.entities} />
                </div>
              ))}
            </section>
          )
        }

        // ppb
        const parts = stream.parts
          .map((part) => ({
            ...part,
            sections: part.sections
              .map((s) => ({ ...s, entities: s.entities.filter(matches) }))
              .filter((s) => s.entities.length > 0),
          }))
          .filter((p) => p.sections.length > 0)
        if (parts.length === 0) return null

        return (
          <section key={key} className="space-y-5">
            <StreamHeading type={stream.type} />
            {parts.map((part) => (
              <div key={part.part} className="space-y-3">
                <h3 className="text-sm font-semibold">
                  <span className="text-muted-foreground">
                    Part {part.part}.
                  </span>{' '}
                  {part.part_title}
                </h3>
                {part.sections.map((section) => (
                  <div key={section.section} className="space-y-2">
                    <SubHeading>{sectionLabel(section)}</SubHeading>
                    <CardGrid entities={section.entities} />
                  </div>
                ))}
              </div>
            ))}
          </section>
        )
      })}

      {term && countMatches(streams, matches) === 0 && (
        <p className="text-sm text-muted-foreground">
          No entities match “{search.trim()}”.
        </p>
      )}

      {!term && (
        <p className="pt-2 text-xs text-muted-foreground">
          {totalEntities} entities across the budget.
        </p>
      )}
    </div>
  )
}

function StreamHeading({ type }: { type: keyof typeof BUDGET_STREAM_LABELS }) {
  return (
    <h2 className="border-b border-border pb-1.5 text-xs font-semibold tracking-wide text-un-blue uppercase">
      {BUDGET_STREAM_LABELS[type]}
    </h2>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}

function CardGrid({ entities }: { entities: BudgetEntityNode[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {entities.map((entity) => (
        <Link
          key={entity.entity}
          href={`/?entity=${encodeURIComponent(entity.entity)}`}
          className="group flex items-start justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-un-blue/40 hover:bg-accent"
        >
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold">{entity.entity}</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {entity.count}
              </span>
            </div>
            {entity.entity_long && (
              <div
                className="truncate text-xs text-muted-foreground"
                title={entity.entity_long}
              >
                {entity.entity_long}
              </div>
            )}
          </div>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-un-blue" />
        </Link>
      ))}
    </div>
  )
}

function countEntities(streams: BudgetStream[]): number {
  const seen = new Set<string>()
  for (const stream of streams) {
    if (stream.type === 'ppb') {
      for (const part of stream.parts)
        for (const section of part.sections)
          for (const e of section.entities) seen.add(e.entity)
    } else if (stream.type === 'pko') {
      for (const group of stream.groups)
        for (const e of group.entities) seen.add(e.entity)
    }
  }
  return seen.size
}

function countMatches(
  streams: BudgetStream[],
  matches: (e: BudgetEntityNode) => boolean
): number {
  let n = 0
  for (const stream of streams) {
    if (stream.type === 'ppb') {
      for (const part of stream.parts)
        for (const section of part.sections)
          n += section.entities.filter(matches).length
    } else if (stream.type === 'pko') {
      for (const group of stream.groups)
        n += group.entities.filter(matches).length
    }
  }
  return n
}
