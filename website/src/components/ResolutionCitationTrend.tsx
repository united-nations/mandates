'use client'

import { YearOverlayTrend } from '@/components/YearOverlayTrend'
import type { ResolutionCitationTrendYear } from '@/lib/data/mandates'
import { explainerTexts } from '@/lib/en_text_contents'

const citationSeries = [
  {
    key: 'foundational',
    label: explainerTexts.citationTrend.foundational,
    color: 'bg-un-blue-shade',
  },
  {
    key: 'legislative',
    label: explainerTexts.citationTrend.legislative,
    color: 'bg-un-blue',
  },
  {
    key: 'other',
    label: explainerTexts.citationTrend.other,
    color: 'bg-un-blue-tint',
  },
]

/**
 * "Resolutions vs. cited mandates" — how many resolutions/decisions are adopted
 * each year, and how many of them the programme budget cites as mandates.
 * Rendering and year-click filtering live in {@link YearOverlayTrend}.
 */
export function ResolutionCitationTrend({
  data,
}: {
  data: ResolutionCitationTrendYear[]
}) {
  return (
    <YearOverlayTrend
      data={data.map((d) => ({
        year: d.year,
        total: d.resolutions,
        highlight: d.citedMandates,
        parts: {
          foundational: d.foundationalMandates,
          legislative: d.legislativeMandates,
          other: d.otherCitedMandates,
        },
      }))}
      compositionNote={explainerTexts.citationTrend.note}
      highlightSeries={citationSeries}
      totalLabel="Resolutions & decisions adopted"
      highlightLabel="Cited as mandates"
      complementLabel={explainerTexts.trendComposition.notCited}
      totalHoverLabel="adopted"
      highlightHoverLabel="cited"
    />
  )
}
