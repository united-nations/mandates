'use client'

import { Fragment, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleArrowRight,
} from 'lucide-react'
import { ExpenditureAmount } from '@/components/ExpenditureAmount'
import {
  DetailFootnote,
  DetailSectionHeading,
} from '@/components/MandateDetailUi'
import { ChipDot } from '@/components/ui/chip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ExpenditureMap } from '@/lib/entity-expenditure'
import {
  buildResolutionCitationTree,
  resolutionCitationHref,
} from '@/lib/resolution-citation-tree'
import { explainerTexts } from '@/lib/en_text_contents'
import {
  FOUNDATIONAL_DOT_LEGEND,
  isFoundational,
  MARK_FOUNDATIONAL_CHIPS_ON_DETAIL_PAGE,
} from '@/lib/foundational'
import type { Entity, Mandate } from '@/types'

export {
  ExpenditureAmount,
  formatBudgetUsd,
} from '@/components/ExpenditureAmount'

interface CitationCountsProps {
  mandate: Mandate
  entities: Entity[]
  expenditures?: ExpenditureMap
  budgetVersion?: string
}
const DEFAULT_SHOWN = 5
// The shared table defaults to 14px. Pin headers independently of its scale.
const HEADER_TEXT_STYLE = { fontSize: '12px', fontWeight: 500 } as const

/** Entity totals are independent; children are only this resolution's citation sites. */
export function CitationCounts({
  mandate,
  entities,
  expenditures = {},
  budgetVersion,
}: CitationCountsProps) {
  const [showAll, setShowAll] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const { tree } = useMemo(
    () => buildResolutionCitationTree(mandate, entities),
    [mandate, entities]
  )
  const text = explainerTexts.mandateDetail.citationCounts
  const locationText = explainerTexts.entitiesAndProgrammes
  const maximumCount = Math.max(
    1,
    ...tree.flatMap((e) => [
      e.count ?? 0,
      ...e.children.map((c) => c.count ?? 0),
    ])
  )
  const maximumExpenditure = Math.max(
    1,
    ...Object.values(expenditures).flatMap((e) =>
      e.status === 'matched' ? [e.amount] : []
    )
  )
  if (!tree.length) return null
  const shown = showAll ? tree : tree.slice(0, DEFAULT_SHOWN)
  const toggle = (id: string) =>
    setExpanded((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const metrics = (
    id: string,
    label: string,
    count: number | null,
    financial: boolean
  ) => {
    const expenditure = expenditures[id]
    return (
      <>
        <TableCell className="px-1 py-1 text-xs leading-5 tabular-nums sm:px-2 sm:text-sm">
          <span className="grid grid-cols-[1rem_minmax(0,1fr)_1rem] items-center gap-1 sm:grid-cols-[3rem_minmax(0,1fr)_1rem]">
            {count !== null ? (
              <>
                <MetricBar value={count} maximum={maximumCount} />
                <span className="text-right">
                  {count.toLocaleString('en-US')}
                </span>
              </>
            ) : (
              <>
                <span />
                <span className="text-right text-muted-foreground">—</span>
              </>
            )}
            <a
              href={resolutionCitationHref(id, budgetVersion)}
              title={`${locationText.openMandates}: ${label}`}
              aria-label={`${locationText.openMandates}: ${label}`}
              className="rounded-full text-un-blue-text hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <CircleArrowRight className="size-4" aria-hidden />
            </a>
          </span>
        </TableCell>
        <TableCell className="py-1 pr-1 pl-2 text-xs leading-5 tabular-nums sm:pr-2 sm:pl-4 sm:text-sm">
          {financial &&
            (expenditure?.status === 'matched' ? (
              <span className="grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-1 whitespace-nowrap sm:grid-cols-[3rem_minmax(0,1fr)]">
                <MetricBar
                  value={expenditure.amount}
                  maximum={maximumExpenditure}
                />
                <ExpenditureAmount
                  expenditure={expenditure}
                  scopeLabel={label}
                  className="justify-self-end"
                />
              </span>
            ) : (
              <span
                className="block text-right text-muted-foreground"
                title={
                  expenditure?.status === 'unavailable'
                    ? explainerTexts.entityExpenditure.unavailable[
                        expenditure.reason
                      ]
                    : explainerTexts.entityExpenditure.loading
                }
              >
                {expenditure ? locationText.unavailable : '—'}
              </span>
            ))}
        </TableCell>
      </>
    )
  }
  return (
    <section className="space-y-3">
      <DetailSectionHeading
        hint={`${tree.length} ${tree.length === 1 ? text.entity : text.entities}`}
        howTo={text.howTo}
        disclaimer={text.disclaimer}
      >
        {text.title}
      </DetailSectionHeading>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead
              style={HEADER_TEXT_STYLE}
              className="h-8 px-1 text-left sm:px-2"
            >
              {text.location}
            </TableHead>
            <TableHead
              style={HEADER_TEXT_STYLE}
              className="h-8 w-20 px-1 text-left sm:w-32 sm:px-2"
            >
              {text.mandates}
            </TableHead>
            <TableHead
              style={HEADER_TEXT_STYLE}
              className="h-8 w-24 pr-1 pl-2 text-left sm:w-36 sm:pr-2 sm:pl-4"
            >
              {text.expenditure}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((entity) => {
            const open = entity.expandable && expanded.has(entity.id)
            const marked =
              MARK_FOUNDATIONAL_CHIPS_ON_DETAIL_PAGE &&
              isFoundational(entity.entity, mandate.foundational_entities ?? [])
            return (
              <Fragment key={entity.id}>
                <TableRow>
                  <TableCell
                    className="overflow-hidden px-1 py-1 leading-5 sm:px-2"
                    title={entity.entityLong ?? entity.entity}
                  >
                    <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                      <span className="shrink-0 font-semibold">
                        {entity.entity}
                      </span>
                      {marked && <ChipDot />}
                      {entity.expandable && (
                        <button
                          type="button"
                          onClick={() => toggle(entity.id)}
                          aria-expanded={open}
                          aria-label={`${open ? locationText.collapse : locationText.expand} ${entity.entity}`}
                          className="shrink-0 rounded-sm text-muted-foreground hover:text-un-blue-text focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          {open ? (
                            <ChevronDown className="size-4" aria-hidden />
                          ) : (
                            <ChevronRight className="size-4" aria-hidden />
                          )}
                        </button>
                      )}
                    </div>
                  </TableCell>
                  {metrics(
                    entity.id,
                    entity.entityLong ?? entity.entity,
                    entity.count,
                    true
                  )}
                </TableRow>
                {open &&
                  entity.children.map((child) => (
                    <TableRow key={child.id}>
                      <TableCell
                        className="overflow-hidden px-1 py-1 pl-2 leading-5 sm:pr-2 sm:pl-8"
                        title={child.label}
                      >
                        <span className="line-clamp-2 break-words sm:block sm:truncate">
                          {child.label}
                        </span>
                      </TableCell>
                      {metrics(
                        child.id,
                        child.label,
                        child.count,
                        child.financial
                      )}
                    </TableRow>
                  ))}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
      {tree.length > DEFAULT_SHOWN && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="inline-flex items-center gap-1 text-sm font-medium text-un-blue-text hover:underline"
        >
          {showAll ? (
            <ChevronUp className="size-3" aria-hidden />
          ) : (
            <ChevronDown className="size-3" aria-hidden />
          )}
          {showAll ? text.showFewer : `${text.showAll} ${tree.length}`}
        </button>
      )}
      <p className="text-sm text-muted-foreground">
        {explainerTexts.entityExpenditure.note}
      </p>
      {MARK_FOUNDATIONAL_CHIPS_ON_DETAIL_PAGE &&
        tree.some((e) =>
          isFoundational(e.entity, mandate.foundational_entities ?? [])
        ) && <DetailFootnote>{FOUNDATIONAL_DOT_LEGEND}</DetailFootnote>}
    </section>
  )
}

function MetricBar({ value, maximum }: { value: number; maximum: number }) {
  return (
    <span aria-hidden className="h-1.5 w-full rounded-sm bg-muted">
      <span
        className="block h-full rounded-sm bg-un-blue"
        style={{ width: `${Math.min(1, Math.max(0, value / maximum)) * 100}%` }}
      />
    </span>
  )
}
