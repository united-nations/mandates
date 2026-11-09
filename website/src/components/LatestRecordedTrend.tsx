'use client'

import { YearOverlayTrend } from '@/components/YearOverlayTrend'
import type { LatestRecordedTrendYear } from '@/lib/data/mandates'
import { explainerTexts } from '@/lib/en_text_contents'

export function LatestRecordedTrend({
  data,
}: {
  data: LatestRecordedTrendYear[]
}) {
  const texts = explainerTexts.latestRecordedTrend
  return (
    <YearOverlayTrend
      data={data.map((row) => ({
        year: row.year,
        total: row.documents,
        highlight: row.latest,
      }))}
      totalLabel={explainerTexts.documentTrend.total}
      highlightLabel={texts.label}
      complementLabel={texts.complement}
      compositionNote={texts.note}
      totalHoverLabel={explainerTexts.documentTrend.total}
      highlightHoverLabel={texts.hover}
    />
  )
}
