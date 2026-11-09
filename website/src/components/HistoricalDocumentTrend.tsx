'use client'

import { useId, useState } from 'react'

import { YearOverlayTrend } from '@/components/YearOverlayTrend'
import { Input } from '@/components/ui/input'
import { explainerTexts } from '@/lib/en_text_contents'
import { calendarYearWindow } from '@/lib/year-window'

export function HistoricalDocumentTrend({
  data,
  currentYear,
}: {
  data: { year: number; resolutions: number }[]
  currentYear: number
}) {
  const [windowYears, setWindowYears] = useState(5)
  const inputId = useId()
  const years = data.filter((row) => row.year <= currentYear)
  const { startYear, endYear, maxWindow } = calendarYearWindow(
    data.map((row) => row.year),
    currentYear,
    windowYears
  )
  const texts = explainerTexts.documentTrend
  const rangeLabel = (label: string) =>
    label
      .replace('{start}', String(startYear))
      .replace('{end}', String(endYear))

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label htmlFor={inputId}>{texts.windowLabel}</label>
        <Input
          id={inputId}
          type="number"
          min={1}
          max={maxWindow}
          step={1}
          value={windowYears}
          onChange={(event) => {
            const value = event.target.valueAsNumber
            if (Number.isInteger(value) && value >= 1 && value <= maxWindow)
              setWindowYears(value)
          }}
          className="w-20"
        />
        <span className="text-muted-foreground">{rangeLabel(texts.range)}</span>
        {endYear === currentYear && (
          <span className="text-xs text-muted-foreground">
            {texts.partialYear.replace('{year}', String(endYear))}
          </span>
        )}
      </div>
      <YearOverlayTrend
        data={years.map((row) => ({
          year: row.year,
          total: row.resolutions,
          highlight: row.year >= startYear ? row.resolutions : 0,
        }))}
        boundaryYear={startYear}
        totalLabel={texts.total}
        highlightLabel={rangeLabel(texts.recent)}
        complementLabel={rangeLabel(texts.earlier)}
        totalHoverLabel={texts.total}
        highlightHoverLabel={texts.recentHover}
      />
    </div>
  )
}
