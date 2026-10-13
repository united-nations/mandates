'use client'

import { Fragment, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, CircleArrowRight } from 'lucide-react'
import { ExpenditureAmount } from '@/components/ExpenditureAmount'
import { EntityBadge } from '@/components/EntityBadge'
import {
  MandateDetailTableColumns,
  mandateDetailTableClassName,
  mandateDetailTableHeaderClassName,
  mandateDetailTableCellClassName,
} from '@/components/MandateDetailTable'
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
import { citationScope } from '@/lib/citation-budget-location'
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
// The shared table defaults to 14px. Pin headers independently of its scale.
const HEADER_TEXT_STYLE = { fontSize: '12px', fontWeight: 500 } as const
const DEFAULT_SHOWN = 5

/** Entity totals are independent; children are only this resolution's citation sites. */
export function CitationCounts({
  mandate,
  entities,
  expenditures = {},
  budgetVersion,
}: CitationCountsProps) {
  const [showAll, setShowAll] = useState(false)
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
  const metrics = (
    id: string,
    label: string,
    count: number | null,
    financial: boolean
  ) => {
    const expenditure = expenditures[id]
    return (
      <>
        <TableCell
          className={`${mandateDetailTableCellClassName} text-right leading-5 tabular-nums`}
        >
          <span className="grid grid-cols-[1.5rem_minmax(0,1fr)_1rem] items-center gap-1 @min-[52rem]:grid-cols-[3rem_minmax(0,1fr)_1rem] @min-[52rem]:gap-1.5">
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
        <TableCell className="py-1 pr-0 pl-3 text-right align-baseline leading-5 tabular-nums">
          {financial &&
            (expenditure?.status === 'matched' ? (
              <span className="grid grid-cols-[3rem_4rem] items-center justify-end gap-1.5 whitespace-nowrap">
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
    <section className="@container space-y-3">
      <DetailSectionHeading
        hint={`${tree.length} ${tree.length === 1 ? text.entity : text.entities}`}
        howTo={text.howTo}
        disclaimer={text.disclaimer}
      >
        {text.title}
      </DetailSectionHeading>
      <Table className={`${mandateDetailTableClassName} min-w-[30rem]`}>
        <MandateDetailTableColumns budget />
        <TableHeader className={mandateDetailTableHeaderClassName}>
          <TableRow>
            <TableHead
              style={HEADER_TEXT_STYLE}
              className="h-auto px-0 py-1 pr-3 text-left align-top"
            >
              {text.location}
            </TableHead>
            <TableHead
              style={HEADER_TEXT_STYLE}
              className="h-auto px-0 py-1 pr-3 text-left align-top"
            >
              {text.programme}
            </TableHead>
            <TableHead
              style={HEADER_TEXT_STYLE}
              className="h-auto px-0 py-1 pr-3 text-left align-top"
            >
              {text.programmeTitle}
            </TableHead>
            <TableHead
              style={HEADER_TEXT_STYLE}
              className="h-auto px-0 py-1 pr-3 text-right align-top"
            >
              {text.mandates}
            </TableHead>
            <TableHead
              style={HEADER_TEXT_STYLE}
              className="h-auto px-0 py-1 text-right align-top"
            >
              {text.expenditure}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((entity) => {
            const showEntityRow =
              entity.children.length === 0 ||
              entity.children.some(
                (child) => citationScope(child.location).subprogramme === null
              )
            const marked =
              MARK_FOUNDATIONAL_CHIPS_ON_DETAIL_PAGE &&
              isFoundational(entity.entity, mandate.foundational_entities ?? [])
            return (
              <Fragment key={entity.id}>
                {showEntityRow && (
                  <TableRow>
                    <TableCell
                      className={`${mandateDetailTableCellClassName} overflow-hidden leading-5`}
                      title={entity.entityLong ?? entity.entity}
                    >
                      <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                        <EntityBadge
                          entity={entity.entity}
                          entityLong={entity.entityLong}
                          className="font-normal"
                          truncate
                        />
                        {marked && <ChipDot />}
                      </div>
                    </TableCell>
                    <TableCell
                      className={`${mandateDetailTableCellClassName} overflow-hidden leading-5`}
                    >
                      {entity.programmeEntries.map((entry, index) => (
                        <span
                          key={index}
                          className="block break-words @min-[52rem]:truncate"
                          title={entry.identifier}
                        >
                          {entry.identifier}
                        </span>
                      ))}
                    </TableCell>
                    <TableCell
                      className={`${mandateDetailTableCellClassName} overflow-hidden leading-5`}
                    >
                      {entity.programmeEntries.map((entry, index) => (
                        <span
                          key={index}
                          className="block truncate"
                          title={entry.title}
                        >
                          {entry.title || '—'}
                        </span>
                      ))}
                    </TableCell>
                    {metrics(
                      entity.id,
                      entity.entityLong ?? entity.entity,
                      entity.count,
                      true
                    )}
                  </TableRow>
                )}
                {entity.children
                  .filter(
                    (child) =>
                      citationScope(child.location).subprogramme !== null
                  )
                  .map((child) => (
                    <TableRow key={child.id}>
                      <TableCell
                        className={`${mandateDetailTableCellClassName} overflow-hidden leading-5`}
                      >
                        {!showEntityRow && (
                          <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                            <EntityBadge
                              entity={entity.entity}
                              entityLong={entity.entityLong}
                              className="font-normal"
                              truncate
                            />
                            {marked && <ChipDot />}
                          </div>
                        )}
                      </TableCell>
                      <TableCell
                        className={`${mandateDetailTableCellClassName} overflow-hidden leading-5`}
                        title={child.identifier}
                      >
                        <span className="block break-words @min-[52rem]:truncate">
                          {child.identifier}
                        </span>
                      </TableCell>
                      <TableCell
                        className={`${mandateDetailTableCellClassName} overflow-hidden leading-5`}
                        title={child.title}
                      >
                        <span className="block break-words @min-[52rem]:truncate">
                          {child.title || '—'}
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
          onClick={() => setShowAll((value) => !value)}
          aria-expanded={showAll}
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
        {explainerTexts.entityExpenditure.note}{' '}
        {explainerTexts.entityExpenditure.overview}{' '}
        <Link
          href="/secretariat/entities-and-programs"
          className="text-un-blue-text underline underline-offset-2 hover:text-foreground"
        >
          {explainerTexts.secretariatNavigation.entitiesAndPrograms}
        </Link>
        .
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
