'use client'

import { YearOverlayTrend } from '@/components/YearOverlayTrend'
import type { ResolutionCitationTrendYear } from '@/lib/data/mandates'

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
      }))}
      description="Resolutions, decisions and similar documents adopted each year (grey), and how many of them are cited as mandates in the programme budget (blue). Click a year to filter the mandates below to it."
      totalLabel="Resolutions & decisions adopted"
      highlightLabel="Cited as mandates"
      totalHoverLabel="adopted"
      highlightHoverLabel="cited"
    />
  )
}
