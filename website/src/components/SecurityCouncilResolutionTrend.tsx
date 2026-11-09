'use client'

import { YearOverlayTrend } from '@/components/YearOverlayTrend'
import type { SecurityCouncilResolutionTrendYear } from '@/lib/data/mandates'
import { explainerTexts } from '@/lib/en_text_contents'

export function SecurityCouncilResolutionTrend({
  data,
}: {
  data: SecurityCouncilResolutionTrendYear[]
}) {
  const texts = explainerTexts.securityCouncilTrend
  return (
    <YearOverlayTrend
      data={data.map((row) => ({
        year: row.year,
        total: row.documents,
        highlight: row.securityCouncilResolutions,
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
