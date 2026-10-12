'use client'

import {
  Fragment,
  Suspense,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  AgendaCountResult,
  AgendaCountSkeleton,
} from '@/components/AgendaCountLoading'
import { RelatedItemsCell } from '@/components/RelatedItemsCell'
import { SegmentedControl } from '@un-eosg/ui/components/segmented-control'
import { YearSlider } from '@un-eosg/ui/components/year-slider'
import { SearchInput } from '@un-eosg/ui/components/search-input'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, CircleArrowRight } from 'lucide-react'
import type {
  AgendaTitleData,
  AgendaMainCounts,
  AgendaRelatedCounts,
} from '@/lib/data/agenda-items'
import { agendaScopeHref, type AgendaBody } from '@/lib/agenda-scope-client'
import { explainerTexts } from '@/lib/en_text_contents'
import { ParagraphNumberBadge } from '@/components/ui/paragraph-number-badge'
import { groupAgendaNodes, visibleAgendaEntries } from '@/lib/agenda-tree'
import { searchTableRows } from '@/lib/table-search'
import {
  agendaAllocations,
  filterAgendaCommittee,
} from '@/lib/agenda-committee-filter'
import { HierarchicalSingleSelect } from '@un-eosg/ui/components/hierarchical-single-select'
import { agendaSessionLabel } from '@/lib/agenda-session-label'
import { scHeadingDisplayTitle } from '@/lib/sc-agenda'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

type Props = {
  data: AgendaTitleData
  mainCounts?: Promise<AgendaMainCounts>
  relatedCounts?: Promise<AgendaRelatedCounts>
}
const viewHref = (body: AgendaBody, session?: string) =>
  `/secretariat/agenda-items?${new URLSearchParams({ agenda_body: body, ...(session ? { agenda_session: session } : {}) })}`

export function AgendaItemsView({ data, mainCounts, relatedCounts }: Props) {
  const [mainResult, setMainResult] = useState<{
    promise: Promise<AgendaMainCounts>
    result: AgendaMainCounts
  }>()
  const [relatedResult, setRelatedResult] = useState<{
    promise: Promise<AgendaRelatedCounts>
    result: AgendaRelatedCounts
  }>()
  const activePromises = useRef({ mainCounts, relatedCounts })
  useLayoutEffect(() => {
    activePromises.current = { mainCounts, relatedCounts }
  }, [mainCounts, relatedCounts])
  const receiveMain = useCallback(
    (promise: Promise<AgendaMainCounts>, result: AgendaMainCounts) => {
      if (activePromises.current.mainCounts === promise)
        setMainResult({ promise, result })
    },
    []
  )
  const receiveRelated = useCallback(
    (promise: Promise<AgendaRelatedCounts>, result: AgendaRelatedCounts) => {
      if (activePromises.current.relatedCounts === promise)
        setRelatedResult({ promise, result })
    },
    []
  )
  // A previous body/session or refresh promise can never supply the current cells.
  const main =
    mainResult?.promise === mainCounts ? mainResult?.result : undefined
  const related =
    relatedResult?.promise === relatedCounts ? relatedResult?.result : undefined
  const router = useRouter()
  const text = explainerTexts.agendaItems
  const isSc = data.body === 'SC'
  const periodLabel = isSc ? text.year : text.session
  const searchLabel = isSc ? text.scSearch : text.search
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
  const [committee, setCommittee] = useState('')
  const searching = Boolean(query.trim()) || Boolean(committee)
  const allEntries = groupAgendaNodes(ready?.nodes ?? [])
  const availableCommittees = agendaAllocations(
    ready?.nodes.flatMap((node) => node.allocations) ?? []
  )
  const committeeOptions = [
    ...new Set([
      'GA Plenary',
      ...Object.keys(committeeLabels),
      ...availableCommittees.sort(),
    ]),
  ].filter((value) => availableCommittees.includes(value))
  const filteredEntries = filterAgendaCommittee(allEntries, committee)
  const hasExpanders =
    children.size > 0 || allEntries.some((entry) => entry.kind === 'group')
  const entries = searching
    ? searchTableRows(
        filteredEntries.map((entry) => ({
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
                ...(isSc ? [] : [entry.node.item]),
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
  const renderSessionCaption = (session: string | number) => {
    const number = String(session)
    const caption = agendaSessionLabel(data.body, number)
    return (
      <>
        <span className="font-bold">{number}</span>
        <span className="font-normal">{caption.slice(number.length)}</span>
      </>
    )
  }
  return (
    <div className="space-y-4">
      {mainCounts && (
        <Suspense fallback={null}>
          <AgendaCountResult promise={mainCounts} onReady={receiveMain} />
        </Suspense>
      )}
      {relatedCounts && (
        <Suspense fallback={null}>
          <AgendaCountResult promise={relatedCounts} onReady={receiveRelated} />
        </Suspense>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {/* Body dots use the shared UN brand tokens and Transcripts' category mapping. */}
        <div className="[&_label:nth-of-type(1)>span]:after:bg-un-green [&_label:nth-of-type(2)>span]:after:bg-un-orange [&_label:nth-of-type(3)>span]:after:bg-un-blue [&_label:nth-of-type(4)>span]:after:bg-un-purple [&_label>span]:inline-flex [&_label>span]:items-center [&_label>span]:gap-1.5 [&_label>span]:after:size-1.5 [&_label>span]:after:shrink-0 [&_label>span]:after:rounded-full">
          <SegmentedControl
            label={text.body}
            options={[
              { value: 'GA', label: text.ga },
              { value: 'SC', label: text.sc },
              { value: 'ECOSOC', label: text.ecosoc },
              { value: 'HRC', label: text.hrc },
            ]}
            value={data.body}
            onValueChange={(body) => router.push(viewHref(body as AgendaBody))}
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{periodLabel}</span>
          {ready && data.sessions.length > 1 ? (
            <YearSlider
              years={data.sessions.map(Number)}
              selectedYear={Number(ready.session)}
              label={periodLabel}
              formatLabel={(session) =>
                agendaSessionLabel(data.body, String(session))
              }
              renderLabel={renderSessionCaption}
              onChange={(session) =>
                router.push(viewHref(data.body, String(session)))
              }
            />
          ) : (
            <span className="font-normal" aria-disabled={!ready}>
              {ready
                ? renderSessionCaption(ready.session)
                : text.sessionUnavailable}
            </span>
          )}
        </div>
      </div>
      {(main?.status === 'unavailable' ||
        related?.status === 'unavailable') && (
        <p role="status" className="text-xs text-muted-foreground">
          {text.countsUnavailable}{' '}
          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-sm text-un-blue-text hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {text.retryCounts}
          </button>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64 max-w-full">
          <SearchInput
            variant="border-bottom"
            aria-label={searchLabel}
            placeholder={searchLabel}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            showClear
            onClear={() => setQuery('')}
            disabled={!ready}
          />
        </div>
        {data.body === 'GA' && ready && (
          <HierarchicalSingleSelect
            label={text.committee}
            selected={committee || 'all'}
            onChange={(value) => setCommittee(value === 'all' ? '' : value)}
            getLabel={(value) =>
              value === 'all'
                ? text.committee
                : value === 'untagged'
                  ? text.noCommitteeTag
                  : value
            }
            groups={[
              { id: 'all', label: text.allCommittees, children: [] },
              ...committeeOptions.map((value) => ({
                id: value,
                label: value,
                children: [],
              })),
              { id: 'untagged', label: text.noCommitteeTag, children: [] },
            ]}
            searchPlaceholder={text.searchCommittees}
            clearSearchLabel={text.clearCommitteeSearch}
            noResultsLabel={text.noCommitteeOptions}
          />
        )}
      </div>
      {ready ? (
        <>
          {isSc && data.status === 'ready' && (
            <p className="text-sm text-muted-foreground">
              {text.scExplanation.replace('{year}', data.session)}
              {data.dataCutoff && <> {' '}{(data.coverage === 'partial' ? text.scCoveragePartial : text.scCoverageComplete).replace('{date}', data.dataCutoff)}</>}
            </p>
          )}
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead
                  className="h-8 px-2"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                >
                  {isSc ? text.matters : text.item}
                </TableHead>
                <TableHead
                  className="h-8 w-40 ps-2 pe-1"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                >
                  {text.relatedItems}
                </TableHead>
                {isSc && data.status === 'ready' && (
                  <TableHead
                    className="h-8 w-20 px-2 text-right sm:w-24"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                  >
                    {text.meetings}
                  </TableHead>
                )}
                <TableHead
                  className="h-8 w-20 ps-1 pe-2 text-right sm:w-24"
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
                    colSpan={isSc ? 4 : 3}
                    className="px-2 py-3 text-muted-foreground"
                  >
                    {isSc ? text.noMatters : text.noResults}
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
                        colSpan={isSc ? 4 : 3}
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
                const displayTitles = node.titles.map((title) =>
                  isSc ? scHeadingDisplayTitle(title) : title
                )
                const countData =
                  main?.status === 'ready' &&
                  main.body === data.body &&
                  main.session === ready.session
                    ? main.nodes[node.id]
                    : undefined
                return (
                  <TableRow key={node.id}>
                    <TableCell
                      className="overflow-hidden px-2 py-1.5 leading-5"
                      title={[
                        ...displayTitles,
                        ...node.allocations,
                        ...(countData?.titleDifferences ?? []),
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
                        {!isSc && (
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
                        )}
                        <span className="flex min-w-0 flex-1 items-center gap-2 leading-6">
                          <span className="min-w-0 truncate">
                            {displayTitles.join(' / ') ||
                              text.unclassifiedTitle}
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
                    <TableCell className="py-1.5 ps-2 pe-1">
                      <RelatedItemsCell
                        clusters={node.relatedItems ?? []}
                        text={text}
                        counts={related?.counts}
                        countsPending={!related}
                      />
                    </TableCell>
                    {isSc && data.status === 'ready' && (
                      <TableCell className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums">
                        {node.meetingCount?.toLocaleString('en-US')}
                      </TableCell>
                    )}
                    <TableCell className="py-1.5 ps-1 pe-2 whitespace-nowrap tabular-nums">
                      {!main ? (
                        <AgendaCountSkeleton label={text.countsLoading} />
                      ) : !countData ? (
                        <span className="text-xs text-muted-foreground">
                          {text.unavailable}
                        </span>
                      ) : (
                        countData.count > 0 && (
                          <span className="flex items-center justify-end gap-2">
                            <a
                              href={agendaScopeHref(node.scope)}
                              aria-label={`${text.openResolutions}: ${isSc ? displayTitles.join(' / ') : node.item}`}
                              className="inline-flex items-center gap-2 rounded-sm text-un-blue-text hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                              <span className="text-foreground">
                                {countData.count.toLocaleString('en-US')}
                              </span>
                              <CircleArrowRight
                                className="size-4"
                                aria-hidden
                              />
                            </a>
                          </span>
                        )
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
            ? isSc
              ? text.scPermission
              : data.body === 'HRC'
                ? text.hrcPermission
                : text.permission
            : data.status === 'empty'
              ? text.empty
              : isSc
                ? text.scError
                : text.error}
        </p>
      )}
    </div>
  )
}
