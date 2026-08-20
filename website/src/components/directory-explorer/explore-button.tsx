'use client'

import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

export type ExploreCardStateLine =
  | { kind: 'scoped'; cause: string; spokenCause: string }
  | { kind: 'selected'; name: string; title?: string }

interface ExploreButtonProps {
  stateLine?: ExploreCardStateLine
  reserveStateLine: boolean
  count?: number
  countPrefix?: string
  countUnit?: string
  quietLine?: string
  onClick: () => void
}

const StateLine = ({ state }: { state: ExploreCardStateLine }) => (
  <span className="mb-1 block text-[13px] leading-snug">
    {state.kind === 'scoped' ? (
      <>
        <span aria-hidden className="text-gray-600">
          Scoped to {state.cause}
        </span>
        <span className="sr-only">Scoped to {state.spokenCause}:</span>
      </>
    ) : (
      <>
        <span className="font-semibold text-un-blue" title={state.title}>
          {state.name}
        </span>{' '}
        <span className="text-gray-600">selected</span>
      </>
    )}
  </span>
)

const CountFigure = ({
  count,
  prefix,
}: Pick<ExploreButtonProps, 'count'> & {
  prefix?: string
}) => (
  <>
    {count !== undefined && (
      <>
        {prefix !== undefined && ' '}
        <span className="text-[clamp(1.25rem,13.5cqw,2.25rem)] leading-none font-bold text-gray-900 tabular-nums">
          {count.toLocaleString()}
        </span>
      </>
    )}
  </>
)

const CountLine = (
  props: Pick<ExploreButtonProps, 'count' | 'countPrefix' | 'countUnit'>
) => (
  <span className="block leading-tight">
    {props.countPrefix !== undefined && (
      <span className="text-sm font-semibold text-gray-900">
        {props.countPrefix}
      </span>
    )}
    <CountFigure count={props.count} prefix={props.countPrefix} />
    {props.countUnit !== undefined && (
      <span className="text-sm font-semibold text-gray-900">
        {' '}
        {props.countUnit}
      </span>
    )}
  </span>
)

const StateSlot = (
  props: Pick<ExploreButtonProps, 'stateLine' | 'reserveStateLine'>
) => {
  if (props.stateLine) return <StateLine state={props.stateLine} />
  if (!props.reserveStateLine) return null
  return (
    <span
      aria-hidden
      className="mb-1 block min-h-[1lh] text-[13px] leading-snug"
    />
  )
}

const QuietLine = ({ children }: { children?: string }) =>
  children ? (
    <span className="mt-1.5 block text-sm leading-snug text-gray-600 after:inline-block after:w-5 after:content-['']">
      {children}
    </span>
  ) : null

const CardContent = (props: ExploreButtonProps) => (
  <>
    <StateSlot {...props} />
    {(props.count !== undefined || props.countPrefix !== undefined) && (
      <CountLine {...props} />
    )}
    <QuietLine>{props.quietLine}</QuietLine>
    <ChevronRight
      aria-hidden
      className="absolute right-4 bottom-4 size-5 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-un-blue"
    />
  </>
)

/** Renders one summary card and its scoped/selected state. */
export function ExploreButton(props: ExploreButtonProps) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        'group @container relative flex flex-col rounded-lg border border-gray-200 bg-white px-4 py-4 text-left transition-all hover:border-un-blue hover:shadow-md focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none',
        props.stateLine?.kind === 'scoped' && 'explore-scope-mark'
      )}
    >
      <CardContent {...props} />
    </button>
  )
}
