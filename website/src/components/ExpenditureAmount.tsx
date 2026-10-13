'use client'

import { useId } from 'react'
import { ExternalLink } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { FUNDING_SOURCES, type EntityExpenditure } from '@/lib/entity-expenditure'
import { explainerTexts } from '@/lib/en_text_contents'
import { cn } from '@/lib/utils'
import { formatBudgetUsd } from '@/lib/format-budget'

export { formatBudgetUsd } from '@/lib/format-budget'

export interface ExpenditureAmountProps {
  expenditure?: EntityExpenditure
  /** The actual matched scope, supplied by the caller; no scope is inferred. */
  scopeLabel?: string
  className?: string
}

type MatchedExpenditure = Extract<EntityExpenditure, { status: 'matched' }>
const fundingColors = {
  regular_budget: '#009edb',
  other_assessed: '#4db8e8',
  extrabudgetary: '#99d6f2',
}

/** Compact table amount with a click/keyboard disclosure for figures and evidence. */
export function ExpenditureAmount({ expenditure, scopeLabel, className }: ExpenditureAmountProps) {
  const headingId = useId()
  const text = explainerTexts.entityExpenditure
  if (!expenditure || expenditure.status === 'unavailable') {
    const reason = expenditure?.status === 'unavailable' ? text.unavailable[expenditure.reason] : text.loading
    return <span className={cn('text-muted-foreground', className)} title={reason} aria-label={reason}>–</span>
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          aria-label={`${scopeLabel ? `${scopeLabel}: ` : ''}${text.detailHeading}, ${formatBudgetUsd(expenditure.amount)}, ${expenditure.period}`}
          className={cn('rounded-sm text-foreground tabular-nums underline decoration-dotted underline-offset-4 hover:text-un-blue-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
        >
          {formatBudgetUsd(expenditure.amount)}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)] max-h-[min(32rem,var(--radix-popover-content-available-height))] overflow-y-auto whitespace-normal text-left text-sm"
        aria-labelledby={headingId}
        onClick={(event) => event.stopPropagation()}
      >
        <ExpenditureDetails expenditure={expenditure} scopeLabel={scopeLabel} headingId={headingId} />
      </PopoverContent>
    </Popover>
  )
}

function ExpenditureDetails({ expenditure, scopeLabel, headingId }: {
  expenditure: MatchedExpenditure
  scopeLabel?: string
  headingId: string
}) {
  const text = explainerTexts.entityExpenditure
  return (
    <div className="space-y-3">
      <div>
        <h3 id={headingId} className="text-sm font-medium text-muted-foreground">{text.detailHeading}</h3>
        {scopeLabel && <p className="mt-1 break-words font-medium">{scopeLabel}</p>}
        <p className="mt-1 text-lg font-semibold tabular-nums">{formatBudgetUsd(expenditure.amount)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{text.period}: {expenditure.period}</p>
      </div>
      <div className="border-t border-border pt-3">
        <h4 className="mb-2 text-xs font-medium text-muted-foreground">{text.breakdown}</h4>
        <dl className="grid grid-cols-[minmax(0,1fr)_3rem_auto] items-center gap-x-3 gap-y-2 text-xs">
          {FUNDING_SOURCES.map((key) => expenditure.funding[key] === undefined ? null : (
            <div key={key} className="contents">
              <dt className="flex items-center gap-1.5">
                <span aria-hidden className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: fundingColors[key] }} />
                {text.funding[key]}
              </dt>
              <dd className="contents">
                <span aria-hidden className="h-1.5 w-full rounded-sm bg-muted">
                  {expenditure.amount > 0 && expenditure.funding[key]! >= 0 && (
                    <span className="block h-full rounded-sm" style={{ width: `${Math.min(1, expenditure.funding[key]! / expenditure.amount) * 100}%`, backgroundColor: fundingColors[key] }} />
                  )}
                </span>
                <span className="text-right tabular-nums whitespace-nowrap">{formatBudgetUsd(expenditure.funding[key]!)}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <ExpenditureSources expenditure={expenditure} />
    </div>
  )
}

function ExpenditureSources({ expenditure }: { expenditure: MatchedExpenditure }) {
  const text = explainerTexts.entityExpenditure
  const sources = [...new Map(expenditure.sources.filter((source) => source.url || source.symbol).map((source) => [JSON.stringify([source.url, source.symbol]), source])).values()]
  if (sources.length === 0) return null
  return (
    <div className="space-y-2 border-t border-border pt-3 text-xs">
      {sources.length > 0 && (
        <div>
          <h4 className="mb-1 font-medium text-muted-foreground">{text.sources}</h4>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {sources.map((source) => source.url ? (
              <EvidenceLink key={JSON.stringify(source)} href={source.url} label={source.symbol || text.document} />
            ) : source.symbol ? <span key={source.symbol}>{source.symbol}</span> : null)}
          </div>
        </div>
      )}
    </div>
  )
}

function EvidenceLink({ href, label }: { href: string; label: string }) {
  const hostname = new URL(href).hostname
  if (hostname === 'open.un-two-zero.org' || hostname === 'open.un-two-zero.dev') {
    return <span className="break-words">{label}</span>
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-baseline gap-1 rounded-sm text-un-blue-text underline underline-offset-2 hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="break-words">{label}</span>
      <ExternalLink aria-hidden className="h-3 w-3 shrink-0 self-center" />
    </a>
  )
}
