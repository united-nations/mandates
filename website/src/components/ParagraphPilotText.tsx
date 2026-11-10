'use client'

import type { ReactNode } from 'react'
import { pilotTooltip, type PilotSpan } from '@/lib/paragraph-pilot'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/** Split at every evidence boundary so overlapping activities never swallow actors. */
export function ParagraphPilotText({
  text,
  start,
  spans,
  render,
}: {
  text: string
  start: number
  spans: PilotSpan[]
  render: (text: string) => ReactNode
}) {
  const end = start + text.length
  const relevant = spans.filter((s) => s.start < end && s.end > start)
  const boundaries = [
    ...new Set([
      start,
      end,
      ...relevant.flatMap((s) => [
        Math.max(start, s.start),
        Math.min(end, s.end),
      ]),
    ]),
  ].sort((a, b) => a - b)
  return boundaries.slice(0, -1).map((from, i) => {
    const to = boundaries[i + 1]
    const active = relevant.filter((s) => s.start <= from && s.end >= to)
    const value = render(text.slice(from - start, to - start))
    if (!active.length) return <span key={from}>{value}</span>
    const kind =
      active.find((s) => s.kind === 'assignee')?.kind ??
      active.find((s) => s.kind === 'deliverable')?.kind ??
      active.find((s) => s.kind === 'institutional_target')?.kind ??
      active.find((s) => s.kind === 'mention')?.kind ??
      'activity'
    const style =
      kind === 'assignee'
        ? 'bg-emerald-100 font-medium text-emerald-950 underline decoration-emerald-600 underline-offset-2'
        : kind === 'deliverable'
          ? 'bg-amber-100 text-amber-950'
          : kind === 'mention'
            ? 'bg-violet-100 text-violet-950 underline decoration-violet-500 underline-offset-2'
            : 'bg-sky-100 text-sky-950'
    return (
      <Tooltip key={from}>
        <TooltipTrigger asChild>
          <span tabIndex={0} data-pilot-kind={kind} className={style}>
            {value}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-1">
            {[
              ...new Map(
                active.map((s) => [s.label, pilotTooltip(s)])
              ).values(),
            ].map((info) => (
              <div key={`${info.title}-${info.detail}`} className="space-y-0.5">
                <div className="font-semibold">{info.title}</div>
                <div>{info.detail}</div>
                {info.explanation && (
                  <div className="text-xs opacity-80">{info.explanation}</div>
                )}
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  })
}
