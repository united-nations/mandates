'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSectionFilter } from '@/hooks/use-section-filter'
import { SUBJECT_DOMAIN_LABELS } from '@/lib/filter-constants'
import { domainColor } from '@/lib/subjectDomainColors'
import { cn } from '@/lib/utils'
import type { TopicTrendSubject, TopicTrendYear } from '@/lib/data/mandates'
import { MousePointerClick, Sparkles } from 'lucide-react'

/**
 * Topic trends: for each of the last ten years, the subjects that grew
 * distinctively more frequent than the preceding five years. Rendered as a
 * per-year row of subject pills — tinted by UNBIS domain like the pill-map
 * above — with the subject's first breakout year marked. Recurring and
 * organizational/procedural subjects are already filtered out server-side.
 * Clicking a pill filters the mandate explorer to that subject.
 */
export function TopicTrends({ years }: { years: TopicTrendYear[] }) {
  const { active, select } = useSectionFilter('subject')

  return (
    <TooltipProvider delayDuration={200}>
      <p className="mb-4 max-w-3xl text-sm text-gray-500">
        Subjects that became distinctively more frequent than the previous five
        years combined, by their share of that year’s documents.{' '}
        <span className="inline-flex items-center gap-0.5 align-baseline">
          <Sparkles className="h-3 w-3 text-un-blue" />
        </span>{' '}
        marks a subject’s first notable appearance. Recurring agenda items and
        procedural subjects are set aside so genuine shifts stand out.
      </p>

      <div>
        {years.map((year) => (
          <div
            key={year.year}
            className="grid grid-cols-[3rem_1fr] gap-4 border-b border-gray-100 py-3 last:border-b-0 sm:grid-cols-[4rem_1fr] sm:gap-6"
          >
            <div className="pt-0.5 leading-tight">
              <div className="text-lg font-semibold text-gray-900 tabular-nums">
                {year.year}
              </div>
              <div className="text-[10px] text-gray-400 tabular-nums">
                {year.docCount.toLocaleString()} docs
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {year.subjects.length === 0 ? (
                <span className="self-center text-sm text-gray-400">
                  No standout new topics
                </span>
              ) : (
                year.subjects.map((s) => (
                  <TrendPill
                    key={s.subject}
                    subject={s}
                    year={year.year}
                    active={active === s.subject}
                    onSelect={select}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  )
}

const formatPct = (fraction: number) => `${(fraction * 100).toFixed(1)}%`

function TrendPill({
  subject,
  year,
  active,
  onSelect,
}: {
  subject: TopicTrendSubject
  year: number
  active: boolean
  onSelect: (value: string) => void
}) {
  const color = domainColor(subject.domainCode)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={`/secretariat?subject=${encodeURIComponent(subject.subject)}`}
          onClick={(e) => {
            e.preventDefault()
            onSelect(subject.subject)
          }}
          className={cn(
            'inline-flex items-baseline gap-1 rounded-full px-2.5 py-0.5 text-xs transition-[filter] hover:brightness-110',
            color.bg,
            color.text,
            active && 'ring-2 ring-un-blue ring-offset-1'
          )}
        >
          {subject.isNew && (
            <Sparkles className="h-3 w-3 self-center opacity-90" />
          )}
          <span className="font-medium">{subject.subject}</span>
          <span className="text-[10px] tabular-nums opacity-80">
            {formatPct(subject.shareNow)}
          </span>
        </a>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="font-medium">
          {SUBJECT_DOMAIN_LABELS[subject.domainCode] ?? subject.domainCode}
        </div>
        <div className="mt-0.5 text-xs">
          {subject.isNew && 'First notable appearance. '}
          {formatPct(subject.shareBefore)} → {formatPct(subject.shareNow)} of
          documents ({subject.docCount} in {year}).
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-un-blue">
          <MousePointerClick className="h-3.5 w-3.5" />
          Click to show mandates
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
