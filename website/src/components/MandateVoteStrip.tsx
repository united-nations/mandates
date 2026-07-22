'use client'

import { useState } from 'react'

import type { VoteInfo } from '@/lib/consensus'
import type { CountryVoteBreakdown } from '@/lib/data/country-votes'

/**
 * Compact adoption strip for the mandate detail view (rendered identically in
 * the modal sheet and the standalone /mandate page).
 *
 * Recorded vote → a proportional in-favour / against / abstentions bar with
 * counts; adopted without a vote → a single line. Unknown → nothing (the
 * Digital Library has no adoption record for ~0.5% of resolutions and for
 * most non-resolution documents).
 *
 * When the Digital Library Voting Data collection covers the document
 * (recorded votes 2015-present), the strip also names the minority: who voted
 * against, who abstained. Long lists start collapsed.
 *
 * Colours: polarity pair blue (in favour) / red (against) with a neutral grey
 * for abstentions — CVD-validated against the light surface; the visible
 * counts and labels carry the values, the colours only orient.
 */
export function MandateVoteStrip({
  vote,
  countries,
}: {
  vote: VoteInfo | null
  countries?: CountryVoteBreakdown | null
}) {
  if (!vote) return null

  if (vote.kind === 'without-vote') {
    return (
      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          Adopted without a vote
        </span>
        {vote.meeting && <span> · {vote.meeting}</span>}
      </div>
    )
  }

  const total = vote.inFavour + vote.against + vote.abstentions
  if (total === 0) return null

  const segments = [
    { label: 'in favour', count: vote.inFavour, className: 'bg-un-blue-deep' },
    { label: 'against', count: vote.against, className: 'bg-tier-1' },
    {
      label: 'abstentions',
      count: vote.abstentions,
      className: 'bg-dusty-gray',
    },
  ]

  return (
    <div>
      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          Adopted by recorded vote
        </span>
        {vote.meeting && <span> · {vote.meeting}</span>}
      </div>
      {/* Proportional strip with 2px surface gaps between segments */}
      <div className="mt-2 flex h-2 w-full max-w-md gap-0.5 overflow-hidden rounded-full">
        {segments
          .filter((s) => s.count > 0)
          .map((s) => (
            <div
              key={s.label}
              className={`${s.className} h-full rounded-full`}
              style={{ width: `${(s.count / total) * 100}%` }}
            />
          ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {segments.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${s.className}`}
            />
            <span className="font-medium text-foreground tabular-nums">
              {s.count.toLocaleString()}
            </span>
            {s.label}
          </span>
        ))}
      </div>
      {countries && (
        <div className="mt-2 space-y-1">
          <CountryList
            label="Against"
            dotClass="bg-tier-1"
            names={countries.against.map((c) => c.name)}
          />
          <CountryList
            label="Abstaining"
            dotClass="bg-dusty-gray"
            names={countries.abstaining.map((c) => c.name)}
          />
        </div>
      )}
    </div>
  )
}

const LIST_COLLAPSED = 12

/** One minority line: "Against: A, B, C and 24 more". */
function CountryList({
  label,
  dotClass,
  names,
}: {
  label: string
  dotClass: string
  names: string[]
}) {
  const [expanded, setExpanded] = useState(false)
  if (names.length === 0) return null
  const shown = expanded ? names : names.slice(0, LIST_COLLAPSED)
  const hidden = names.length - shown.length
  return (
    <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
      <span className="inline-flex items-baseline gap-1.5">
        <span
          className={`inline-block h-2 w-2 self-center rounded-full ${dotClass}`}
        />
        <span className="font-medium text-foreground">{label}:</span>
      </span>{' '}
      {shown.join(', ')}
      {hidden > 0 && (
        <>
          {' '}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-un-blue hover:text-un-blue/80"
          >
            and {hidden} more
          </button>
        </>
      )}
      {expanded && names.length > LIST_COLLAPSED && (
        <>
          {' '}
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-un-blue hover:text-un-blue/80"
          >
            show fewer
          </button>
        </>
      )}
    </p>
  )
}
