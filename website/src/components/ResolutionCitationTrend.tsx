'use client'

import { YearOverlayTrend } from '@/components/YearOverlayTrend'
import type { ResolutionCitationTrendYear } from '@/lib/data/mandates'
import { explainerTexts } from '@/lib/en_text_contents'

const citationSeries = [
  {
    key: 'peacekeeping',
    label: explainerTexts.citationTrend.peacekeeping,
    color: 'bg-un-blue-muted',
    membership: 'peacekeepingMembership',
  },
  {
    key: 'foundational',
    label: explainerTexts.citationTrend.foundational,
    color: 'bg-un-blue-shade',
    membership: 'foundationalMembership',
  },
  {
    key: 'legislative',
    label: explainerTexts.citationTrend.legislative,
    color: 'bg-un-blue',
    membership: 'legislativeMembership',
  },
  {
    key: 'planOutline',
    label: explainerTexts.citationTrend.planOutline,
    color: 'bg-un-blue-tint',
    membership: 'planOutlineMembership',
  },
] as const

export function ResolutionCitationTrend({
  data,
}: {
  data: ResolutionCitationTrendYear[]
}) {
  return (
    <YearOverlayTrend
      data={data.map((row) => ({
        year: row.year,
        total: row.resolutions,
        highlight: row.citedMandates,
        parts: {
          peacekeeping: row.peacekeepingMandates,
          foundational: row.foundationalMandates,
          legislative: row.legislativeMandates,
          planOutline: row.planOutlineMandates,
        },
      }))}
      highlightSeries={citationSeries.map((part) => ({
        ...part,
        totalMembership: data.reduce(
          (sum, row) => sum + row[part.membership],
          0
        ),
      }))}
      compositionNote={explainerTexts.citationTrend.note}
      totalLabel="Resolutions & decisions adopted"
      highlightLabel="Cited as mandates"
      complementLabel={explainerTexts.trendComposition.notCited}
      totalHoverLabel="adopted"
      highlightHoverLabel="cited"
    />
  )
}
