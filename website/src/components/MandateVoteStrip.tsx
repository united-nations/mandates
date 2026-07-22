import type { VoteInfo } from '@/lib/consensus'

/**
 * Compact adoption strip for the mandate detail view (rendered identically in
 * the modal sheet and the standalone /mandate page).
 *
 * Recorded vote → a proportional in-favour / against / abstentions bar with
 * counts; adopted without a vote → a single line. Unknown → nothing (the
 * Digital Library has no adoption record for ~0.5% of resolutions and for
 * most non-resolution documents).
 *
 * Colours: polarity pair blue (in favour) / red (against) with a neutral grey
 * for abstentions — CVD-validated against the light surface; the visible
 * counts and labels carry the values, the colours only orient.
 */
export function MandateVoteStrip({ vote }: { vote: VoteInfo | null }) {
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
    </div>
  )
}
