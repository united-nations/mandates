'use client'

import { useState } from 'react'
import { SearchInput } from '@un-eosg/ui/components/search-input'
import { searchTableRows } from '@/lib/table-search'
import { ChevronDown, ChevronRight, CircleArrowRight } from 'lucide-react'
import Link from 'next/link'
import { budgetLocationHref } from '@/lib/budget-location-links'
import { ExpenditureAmount } from '@/components/ExpenditureAmount'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { EntityProgrammeRow } from '@/lib/entities-programmes-tree'
import type { ExpenditureMap } from '@/lib/entity-expenditure'
import { explainerTexts } from '@/lib/en_text_contents'

export function EntitiesProgrammesTable({
  rows,
  expenditures,
  budgetVersion,
}: {
  rows: EntityProgrammeRow[]
  expenditures: ExpenditureMap
  budgetVersion: string
}) {
  const text = explainerTexts.entitiesAndProgrammes
  const moneyText = explainerTexts.entityExpenditure
  const maximumCount = Math.max(1, ...rows.map((row) => row.count))
  const maximumExpenditure = Math.max(
    1,
    ...rows.flatMap((row) => {
      const value = expenditures[row.id]
      return (row.kind === 'entity' || row.kind === 'subprogramme') &&
        value?.status === 'matched'
        ? [value.amount]
        : []
    })
  )
  // Exceptions to the default: ancestors open, entity children collapsed.
  const [toggled, setToggled] = useState<Set<string>>(() => new Set())
  const [query, setQuery] = useState('')
  const searching = Boolean(query.trim())
  const visible = new Set<string>()
  const visibleRows = searching
    ? searchTableRows(rows, query, (row) =>
        [row.label, row.detail, row.entityCode].filter(Boolean).join(' ')
      )
    : rows.filter((row) => {
        if (row.parentId && !visible.has(row.parentId)) return false
        const open =
          row.kind === 'entity' ? toggled.has(row.id) : !toggled.has(row.id)
        if (open) visible.add(row.id)
        return true
      })
  const toggle = (id: string) =>
    setToggled((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="space-y-4">
      <div className="w-64 max-w-full">
        <SearchInput
          variant="border-bottom"
          aria-label={text.search}
          placeholder={text.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          showClear
          onClear={() => setQuery('')}
        />
      </div>
      {rows.length === 0 ? (
        <p>{text.empty}</p>
      ) : (
        <Table className="table-fixed [--budget-indent:4px] sm:[--budget-indent:16px]">
          <TableHeader>
            <TableRow>
              <TableHead className="h-8 px-2">{text.location}</TableHead>
              <TableHead
                className="h-8 w-24 px-1 text-left sm:w-37 sm:px-2"
                title={text.coverage}
              >
                {text.documents}
              </TableHead>
              <TableHead
                className="h-8 w-28 pr-1 pl-3 text-left sm:w-43 sm:pr-2 sm:pl-4"
                title={text.moneyNote}
              >
                {text.expenditure}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="px-2 py-3 text-muted-foreground"
                >
                  {text.noResults}
                </TableCell>
              </TableRow>
            )}
            {visibleRows.map((row) => {
              const open =
                searching ||
                (row.kind === 'entity'
                  ? toggled.has(row.id)
                  : !toggled.has(row.id))
              const expenditure = expenditures[row.id]
              const showExpenditure =
                row.kind === 'entity' || row.kind === 'subprogramme'
              const mandateHref = budgetLocationHref(row, budgetVersion)
              return (
                <TableRow key={row.id}>
                  <TableCell
                    className="overflow-hidden px-1 py-1 leading-5 sm:px-2"
                    title={[row.label, row.detail].filter(Boolean).join(' — ')}
                  >
                    <div
                      style={{
                        paddingLeft: `calc(var(--budget-indent) * ${row.depth})`,
                      }}
                      className="min-w-0 whitespace-nowrap"
                    >
                      {row.hasChildren ? (
                        <button
                          type="button"
                          disabled={searching}
                          onClick={() => toggle(row.id)}
                          aria-expanded={open}
                          aria-label={`${open ? text.collapse : text.expand} ${row.label}`}
                          className="flex w-full min-w-0 items-center gap-1.5 text-left font-medium hover:text-un-blue-text"
                        >
                          {open ? (
                            <ChevronDown
                              className="size-4 shrink-0"
                              aria-hidden
                            />
                          ) : (
                            <ChevronRight
                              className="size-4 shrink-0"
                              aria-hidden
                            />
                          )}
                          <span
                            className={
                              row.kind === 'entity'
                                ? 'shrink-0 font-semibold'
                                : 'truncate'
                            }
                          >
                            {row.label}
                          </span>
                          {row.detail && (
                            <span className="truncate font-normal text-muted-foreground">
                              {row.detail}
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="flex min-w-0 items-center gap-1.5 pl-[22px]">
                          <span
                            className={
                              row.kind === 'entity'
                                ? 'shrink-0 font-semibold'
                                : 'truncate'
                            }
                          >
                            {row.label}
                          </span>
                          {row.detail && (
                            <span className="truncate font-normal text-muted-foreground">
                              {row.detail}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-1 py-1 text-right leading-5 tabular-nums sm:px-2">
                    <span className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)_1rem] items-center gap-1 sm:grid-cols-[3.75rem_minmax(0,1fr)_1rem] sm:gap-1.5">
                      <span
                        aria-hidden
                        className="h-1.5 w-full rounded-sm bg-muted"
                      >
                        <span
                          className="block h-full rounded-sm bg-un-blue"
                          style={{
                            width: `${Math.min(1, Math.max(0, row.count / maximumCount)) * 100}%`,
                          }}
                        />
                      </span>
                      <span className="text-right">
                        {row.count.toLocaleString('en-US')}
                      </span>
                      {
                        <Link
                          href={mandateHref}
                          prefetch={false}
                          aria-label={`${text.openMandates}: ${row.label}`}
                          title={`${text.openMandates}: ${row.label}`}
                          className="shrink-0 rounded-full text-un-blue-text hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <CircleArrowRight className="size-4" aria-hidden />
                        </Link>
                      }
                    </span>
                  </TableCell>
                  <TableCell className="py-1 pr-1 pl-3 text-right leading-5 tabular-nums sm:pr-2 sm:pl-4">
                    {showExpenditure &&
                      (expenditure?.status === 'matched' ? (
                        <span className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-1 whitespace-nowrap sm:grid-cols-[3.75rem_minmax(0,1fr)] sm:gap-1.5">
                          <span
                            aria-hidden
                            className="h-1.5 w-full rounded-sm bg-muted"
                          >
                            <span
                              className="block h-full rounded-sm bg-un-blue"
                              style={{
                                width: `${Math.min(1, Math.max(0, expenditure.amount / maximumExpenditure)) * 100}%`,
                              }}
                            />
                          </span>
                          <ExpenditureAmount
                            expenditure={expenditure}
                            scopeLabel={row.label}
                            className="justify-self-end"
                          />
                        </span>
                      ) : (
                        <span
                          className="text-muted-foreground"
                          title={
                            expenditure?.status === 'unavailable'
                              ? expenditure.reason === 'not_matched'
                                ? text.unavailableScope
                                : moneyText.unavailable[expenditure.reason]
                              : moneyText.unavailable.source_unavailable
                          }
                        >
                          {text.unavailable}
                        </span>
                      ))}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
