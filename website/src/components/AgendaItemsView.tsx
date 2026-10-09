'use client'

import { Fragment, useState } from 'react'
import { SegmentedControl } from '@un-eosg/ui/components/segmented-control'
import { YearSlider } from '@un-eosg/ui/components/year-slider'
import { SearchInput } from '@un-eosg/ui/components/search-input'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, CircleArrowRight } from 'lucide-react'
import type { getAgendaPageData } from '@/lib/data/agenda-items'
import { agendaScopeHref, type AgendaBody } from '@/lib/agenda-scope'
import { explainerTexts } from '@/lib/en_text_contents'
import { ParagraphNumberBadge } from '@/components/ui/paragraph-number-badge'
import { groupAgendaNodes, visibleAgendaEntries } from '@/lib/agenda-tree'
import { searchTableRows } from '@/lib/table-search'
import { agendaSessionLabel } from '@/lib/agenda-session-label'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

type Props = { data: Awaited<ReturnType<typeof getAgendaPageData>> }
const viewHref = (body: AgendaBody, session?: string) =>
  `/secretariat/agenda-items?${new URLSearchParams({ agenda_body: body, ...(session ? { agenda_session: session } : {}) })}`

export function AgendaItemsView({ data }: Props) {
  const router = useRouter()
  const text = explainerTexts.agendaItems
  const ready = data.status === 'ready' ? data : null
  const numberCharacters = Math.max(
    1,
    ...(ready?.nodes.map((node) => node.item.length) ?? [])
  )
  const committeeLabels: Record<string, string> = text.committeeAbbreviations
  const children = new Set(
    ready?.nodes.flatMap((node) => (node.parentId ? [node.parentId] : [])) ?? []
  )
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(children)
  )
  const [query, setQuery] = useState('')
  const searching = Boolean(query.trim())
  const allEntries = groupAgendaNodes(ready?.nodes ?? [])
  const hasExpanders =
    children.size > 0 || allEntries.some((entry) => entry.kind === 'group')
  const entries = searching
    ? searchTableRows(
        allEntries.map((entry) => ({
          ...entry,
          parentId:
            entry.kind === 'item'
              ? (entry.node.parentId ?? entry.groupId)
              : undefined,
        })),
        query,
        (entry) =>
          entry.kind === 'group'
            ? entry.label
            : [
                entry.node.item,
                ...entry.node.titles,
                ...entry.node.allocations,
                ...entry.node.allocations.flatMap((allocation) =>
                  allocation
                    .split(';')
                    .map((label) => committeeLabels[label.trim()] ?? '')
                ),
              ].join(' ')
      )
    : visibleAgendaEntries(allEntries, collapsed)
  const toggle = (id: string) =>
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          label={text.body}
          options={[
            { value: 'GA', label: text.ga },
            { value: 'ECOSOC', label: text.ecosoc },
            { value: 'HRC', label: text.hrc },
          ]}
          value={data.body}
          onValueChange={(body) => router.push(viewHref(body as AgendaBody))}
        />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{text.session}</span>
          {ready && data.sessions.length > 1 ? (
            <div className="[&_span]:font-normal">
              <YearSlider
                years={data.sessions.map(Number)}
                selectedYear={Number(ready.session)}
                label={text.session}
                formatLabel={(session) =>
                  agendaSessionLabel(data.body, String(session))
                }
                onChange={(session) =>
                  router.push(viewHref(data.body, String(session)))
                }
              />
            </div>
          ) : (
            <span className="font-normal" aria-disabled={!ready}>
              {ready
                ? agendaSessionLabel(data.body, ready.session)
                : text.sessionUnavailable}
            </span>
          )}
        </div>
        <SearchInput
          variant="border-bottom"
          aria-label={text.search}
          placeholder={text.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          showClear
          onClear={() => setQuery('')}
          disabled={!ready}
        />
      </div>
      {ready ? (
        <>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead
                  className="h-8 px-2"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                >
                  {text.item}
                </TableHead>
                <TableHead
                  className="h-8 w-28 px-2 text-right sm:w-36"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                >
                  {text.resolutions}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="px-2 py-3 text-muted-foreground"
                  >
                    {text.noResults}
                  </TableCell>
                </TableRow>
              )}
              {entries.map((entry) => {
                if (entry.kind === 'group') {
                  const suffixStart = entry.label.includes(
                    'Promotion of sustained economic growth and sustainable development'
                  )
                    ? entry.label.indexOf('in accordance with')
                    : -1
                  return (
                    <TableRow key={entry.id}>
                      <TableCell
                        colSpan={2}
                        className="overflow-hidden bg-muted/30 px-2 py-2 font-bold"
                      >
                        <button
                          type="button"
                          onClick={() => toggle(entry.id)}
                          disabled={searching}
                          aria-expanded={searching || !collapsed.has(entry.id)}
                          aria-label={`${collapsed.has(entry.id) ? text.expand : text.collapse} ${entry.label}`}
                          className="flex w-full min-w-0 items-center gap-2 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <span className="flex size-5 shrink-0 items-center justify-center">
                            {!searching && collapsed.has(entry.id) ? (
                              <ChevronRight className="size-4" aria-hidden />
                            ) : (
                              <ChevronDown className="size-4" aria-hidden />
                            )}
                          </span>
                          <span
                            className="min-w-0 flex-1 truncate"
                            title={entry.label}
                          >
                            {suffixStart < 0 ? (
                              entry.label
                            ) : (
                              <>
                                {entry.label.slice(0, suffixStart)}
                                <span className="font-normal">
                                  {entry.label.slice(suffixStart)}
                                </span>
                              </>
                            )}
                          </span>
                        </button>
                      </TableCell>
                    </TableRow>
                  )
                }
                const node = entry.node
                return (
                  <TableRow key={node.id}>
                    <TableCell
                      className="overflow-hidden px-2 py-1.5 leading-5"
                      title={[
                        ...node.titles,
                        ...node.allocations,
                        ...node.titleDifferences,
                      ].join(' · ')}
                    >
                      <div
                        style={{ paddingLeft: `${node.depth * 12}px` }}
                        className="flex min-w-0 items-start gap-2"
                      >
                        {hasExpanders && (
                          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center">
                            {children.has(node.id) && (
                              <button
                                type="button"
                                disabled={searching}
                                aria-expanded={
                                  searching || !collapsed.has(node.id)
                                }
                                aria-label={`${collapsed.has(node.id) ? text.expand : text.collapse} ${node.item}`}
                                className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                onClick={() => toggle(node.id)}
                              >
                                {!searching && collapsed.has(node.id) ? (
                                  <ChevronRight
                                    className="size-4"
                                    aria-hidden
                                  />
                                ) : (
                                  <ChevronDown className="size-4" aria-hidden />
                                )}
                              </button>
                            )}
                          </span>
                        )}
                        <span
                          className="inline-flex min-w-5 shrink-0 items-center text-xs"
                          style={{
                            width: `calc(${numberCharacters}ch + 0.75rem)`,
                          }}
                        >
                          <ParagraphNumberBadge>
                            {node.item}
                          </ParagraphNumberBadge>
                        </span>
                        <span className="flex min-w-0 flex-1 items-center gap-2 leading-6">
                          <span className="min-w-0 truncate">
                            {node.titles.join(' / ') || text.unclassifiedTitle}
                          </span>
                          {node.allocations.length > 0 && (
                            <span className="max-w-1/2 shrink-0 truncate text-xs text-muted-foreground">
                              {[
                                ...new Set(
                                  node.allocations.flatMap((allocation) =>
                                    allocation
                                      .split(';')
                                      .map((label) => label.trim())
                                      .filter(Boolean)
                                  )
                                ),
                              ].map((allocation, index) => (
                                <Fragment key={allocation}>
                                  {index > 0 && ' · '}
                                  <span
                                    title={allocation}
                                    aria-label={allocation}
                                  >
                                    {committeeLabels[allocation] ?? allocation}
                                  </span>
                                </Fragment>
                              ))}
                            </span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 whitespace-nowrap tabular-nums">
                      {node.symbols.length > 0 && (
                        <span className="flex items-center justify-end gap-2">
                          <a
                            href={agendaScopeHref(node.scope)}
                            aria-label={`${text.openResolutions}: ${node.item}`}
                            className="inline-flex items-center gap-2 rounded-sm text-un-blue-text hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            <span className="text-foreground">
                              {node.symbols.length.toLocaleString('en-US')}
                            </span>
                            <CircleArrowRight className="size-4" aria-hidden />
                          </a>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </>
      ) : (
        <p
          role={data.status === 'empty' ? undefined : 'alert'}
          className="rounded-md border border-border px-3 py-3 text-sm text-muted-foreground"
        >
          {data.status === 'permission'
            ? data.body === 'HRC'
              ? text.hrcPermission
              : text.permission
            : data.status === 'empty'
              ? text.empty
              : text.error}
        </p>
      )}
    </div>
  )
}
