'use client'

import { YearOverlayTrend } from '@/components/YearOverlayTrend'
import type { ResolutionRecurrenceTrendYear } from '@/lib/data/mandates'

/**
 * "Genuinely new vs. re-adopted" — of the resolutions adopted each year, how
 * many say something for the first time rather than repeating a resolution the
 * same body already adopted in an earlier year. Rendering and year-click
 * filtering live in {@link YearOverlayTrend}.
 */
export function ResolutionRecurrenceTrend({
  data,
}: {
  data: ResolutionRecurrenceTrendYear[]
}) {
  return (
    <YearOverlayTrend
      data={data.map((d) => ({
        year: d.year,
        total: d.resolutions,
        highlight: d.genuinelyNew,
      }))}
      description="Resolutions and decisions adopted each year (grey), and how many are genuinely new (blue) rather than a re-adoption of one the same body already passed in an earlier year. The gap between the bars is recurrence. Click a year to filter the mandates below to it."
      totalLabel="Resolutions & decisions adopted"
      highlightLabel="Genuinely new"
      totalHoverLabel="adopted"
      highlightHoverLabel="genuinely new"
    />
  )
}
