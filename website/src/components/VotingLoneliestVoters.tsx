'use client'

import type { VotingAnalysis } from '@/lib/data/country-votes'

/**
 * "Loneliest voters" — countries most often on a No side of at most two
 * countries in a GA plenary recorded vote (2015-present). A near-isolated No
 * is the strongest signal a country is voting against a settled majority.
 */
export function VotingLoneliestVoters({
  analysis,
}: {
  analysis: VotingAnalysis
}) {
  const { loneliest, countries, gaCoverage } = analysis
  const max = Math.max(1, ...loneliest.map((d) => d.lonely))

  return (
    <div>
      <p className="mb-3 max-w-3xl text-sm text-gray-500">
        Countries most often on the losing side almost alone: recorded General
        Assembly votes {gaCoverage.from}–{gaCoverage.to} where the country voted
        No and at most one other country joined it.
      </p>
      <ol className="max-w-xl space-y-1">
        {loneliest.map((d, i) => (
          <li
            key={d.iso}
            className="flex items-center gap-2 text-sm"
            title={`${countries[d.iso] ?? d.iso}: ${d.lonely} near-isolated No votes of ${d.totalNo} No votes overall (${d.votes} votes cast)`}
          >
            <span className="w-4 shrink-0 text-right text-[11px] text-gray-400 tabular-nums">
              {i + 1}
            </span>
            <span className="w-40 shrink-0 truncate text-gray-900 sm:w-48">
              {countries[d.iso] ?? d.iso}
            </span>
            <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-tier-1"
                style={{ width: `${(d.lonely / max) * 100}%` }}
              />
            </span>
            <span className="w-24 shrink-0 text-right text-xs text-gray-600 tabular-nums">
              {d.lonely}
              <span className="text-gray-400"> of {d.totalNo} No</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
