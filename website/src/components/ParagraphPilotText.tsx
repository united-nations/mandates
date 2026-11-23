'use client'

import type { ReactNode } from 'react'
import { pilotTooltip, type PilotSpan } from '@/lib/paragraph-pilot'
import {
  pilotDisplaySegments,
  type PilotHighlightLayer,
} from '@/lib/paragraph-pilot-display'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/** Display one semantic layer at a time; evidence roles never compete for a colour. */
export function ParagraphPilotText({
  text,
  start,
  spans,
  render,
  layer = 'activity',
}: {
  text: string
  start: number
  spans: PilotSpan[]
  layer?: PilotHighlightLayer
  render: (text: string) => ReactNode
}) {
  return pilotDisplaySegments(text, start, spans, layer).map((segment) => {
    const from = segment.start
    const active = segment.spans
    const value = render(segment.text)
    if (!active.length) return <span key={from}>{value}</span>
    const kind = active[0].kind
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
