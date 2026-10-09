'use client'

import { AgendaCountSkeleton } from '@/components/AgendaCountLoading'
import { CircleArrowRight } from 'lucide-react'
import type { AgendaBody } from '@/lib/agenda-scope'
import { DisclosurePopover } from '@/components/ui/disclosure-popover'
import { cn } from '@/lib/utils'

export interface RelatedMemberView {
  id: string
  body: AgendaBody
  title: string
  current: boolean
  occurrences: {
    id: string
    session: string
    item: string
    resolutionCount?: number
    status: 'verified' | 'unsupported'
    reason?: string
    href?: string
    referenceNote?: string
  }[]
}

export interface RelatedClusterView {
  id: string
  title: string
  href?: string
  members: RelatedMemberView[]
}

export type RelatedItemsCellText = Record<
  | 'relatedItems'
  | 'currentItem'
  | 'viewClusterResolutions'
  | 'viewResolutions'
  | 'unavailable'
  | 'countsLoading',
  string
>

const BODIES: { body: AgendaBody; label: string; dot: string }[] = [
  { body: 'GA', label: 'GA', dot: 'bg-un-green' },
  { body: 'SC', label: 'SC', dot: 'bg-un-orange' },
  { body: 'ECOSOC', label: 'ECOSOC', dot: 'bg-un-blue' },
  { body: 'HRC', label: 'HRC', dot: 'bg-un-purple' },
]
const LINK_CLASS =
  'rounded-sm text-un-blue-text hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

function BodyDot({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-1.5 shrink-0 rounded-full', className)}
    />
  )
}

export function RelatedItemsCell({
  clusters,
  text,
  counts,
  countsPending = false,
}: {
  clusters: RelatedClusterView[]
  text: RelatedItemsCellText
  counts?: Record<string, number>
  countsPending?: boolean
}) {
  if (!clusters.length) return null
  const badges = BODIES.map((body) => ({
    ...body,
    count: new Set(
      clusters.flatMap((cluster) =>
        cluster.members
          .filter((member) => member.body === body.body && !member.current)
          .map((member) => member.id)
      )
    ).size,
  })).filter((body) => body.count > 0)
  if (!badges.length) return null

  return (
    <DisclosurePopover
      interactive
      label={`${text.relatedItems}: ${badges.map((body) => `${body.label} ${body.count}`).join(', ')}`}
      triggerClassName="flex w-full flex-wrap items-center gap-1 rounded-sm text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      contentClassName="max-h-96 w-[28rem] overflow-y-auto"
      trigger={badges.map((body) => (
        <span
          key={body.body}
          className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 whitespace-nowrap tabular-nums"
        >
          <span>{body.label}</span>
          <BodyDot className={body.dot} />
          <span>{body.count}</span>
        </span>
      ))}
    >
      <div className="space-y-4">
        {clusters.map((cluster) => (
          <section key={cluster.id} className="space-y-2">
            <h3 className="font-medium break-words">{cluster.title}</h3>
            <ul className="divide-y divide-border">
              {BODIES.flatMap((body) =>
                cluster.members
                  .filter((member) => member.body === body.body)
                  .map((member) => (
                    <li key={member.id} className="py-1.5">
                      <div className="grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-2 whitespace-nowrap">
                        <span className="inline-flex w-fit items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 text-xs">
                          {body.label}
                          <BodyDot className={body.dot} />
                        </span>
                        <span
                          className={cn(
                            'min-w-0 truncate',
                            member.current && 'font-medium'
                          )}
                          title={`${member.title}${member.current ? ` (${text.currentItem})` : ''}`}
                        >
                          {member.title}
                          {member.current && (
                            <span className="ms-1.5 text-xs font-normal text-muted-foreground">
                              ({text.currentItem})
                            </span>
                          )}
                        </span>
                        <div className="shrink-0 text-xs tabular-nums">
                          {member.occurrences.map((occurrence) => {
                            const count =
                              counts?.[occurrence.id] ??
                              occurrence.resolutionCount
                            return (
                              <span key={occurrence.id}>
                                {occurrence.status === 'verified' &&
                                countsPending ? (
                                  <AgendaCountSkeleton
                                    label={text.countsLoading}
                                  />
                                ) : occurrence.status === 'verified' &&
                                  occurrence.href &&
                                  typeof count === 'number' ? (
                                  <a
                                    href={occurrence.href}
                                    className={cn(
                                      LINK_CLASS,
                                      'inline-flex items-center gap-1'
                                    )}
                                    aria-label={`${text.viewResolutions}: ${member.title} (${count})`}
                                  >
                                    <span className="text-foreground">
                                      {count.toLocaleString('en-US')}
                                    </span>
                                    <CircleArrowRight
                                      className="size-3.5"
                                      aria-hidden
                                    />
                                  </a>
                                ) : (
                                  <span
                                    className="text-muted-foreground"
                                    title={occurrence.reason}
                                  >
                                    {text.unavailable}
                                  </span>
                                )}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    </li>
                  ))
              )}
            </ul>
            {cluster.href && (
              <a
                href={cluster.href}
                className={cn(LINK_CLASS, 'inline-flex items-center gap-1.5')}
              >
                {text.viewClusterResolutions}
                <CircleArrowRight className="size-3.5" aria-hidden />
              </a>
            )}
          </section>
        ))}
      </div>
    </DisclosurePopover>
  )
}
