'use client'

import { useSectionFilter } from '@/hooks/use-section-filter'
import { cn } from '@/lib/utils'
import {
  CURRENT_GA_SESSION,
  type TopicVoteLeague,
  type TopicVoteShare,
} from '@/lib/consensus'

/**
 * Contested-topics league — the subjects the General Assembly most often
 * settles by recorded vote, next to the ones it settles by consensus. One
 * ranked list per side; the bar is the recorded-vote share. Clicking a topic
 * filters the mandate explorer to that subject (same behaviour as the
 * subjects directory).
 */
export function GaContestedTopics({ league }: { league: TopicVoteLeague }) {
  return (
    <div>
      <p className="mb-4 max-w-3xl text-sm text-gray-500">
        Subjects ranked by how often their General Assembly resolutions were put
        to a recorded vote (sessions 39–{CURRENT_GA_SESSION}, subjects with at
        least 100 resolutions). Click a topic to filter the mandates above to
        it.
      </p>
      <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
        <LeagueColumn
          heading="Most contested"
          note="almost always voted"
          topics={league.contested}
        />
        <LeagueColumn
          heading="Most consensual"
          note="almost never voted"
          topics={league.consensual}
        />
      </div>
    </div>
  )
}

function LeagueColumn({
  heading,
  note,
  topics,
}: {
  heading: string
  note: string
  topics: TopicVoteShare[]
}) {
  const { active, select } = useSectionFilter('subject')

  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold tracking-wide text-gray-700 uppercase">
        {heading} <span className="font-normal text-gray-400">— {note}</span>
      </h4>
      <ol className="space-y-1">
        {topics.map((t, i) => {
          const isActive = active === t.subject
          return (
            <li key={t.subject}>
              <button
                type="button"
                onClick={() => select(t.subject)}
                className={cn(
                  'group flex w-full items-center gap-2 rounded-sm px-1 py-0.5 text-left text-sm transition-colors hover:bg-secondary',
                  isActive && 'bg-secondary ring-1 ring-un-blue'
                )}
                title={`${t.subject}: ${t.voted.toLocaleString()} of ${t.total.toLocaleString()} resolutions adopted by recorded vote (${t.pctVoted.toFixed(1)}%)`}
              >
                <span className="w-4 shrink-0 text-right text-[11px] text-gray-400 tabular-nums">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-gray-900">
                  {t.subject}
                </span>
                {/* Recorded-vote share bar on a fixed 0-100% track */}
                <span className="relative hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-gray-100 sm:inline-block">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-un-blue"
                    style={{ width: `${t.pctVoted}%` }}
                  />
                </span>
                <span className="w-10 shrink-0 text-right text-xs text-gray-600 tabular-nums">
                  {t.pctVoted.toFixed(0)}%
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
