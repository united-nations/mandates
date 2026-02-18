'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Slider } from '@/components/ui/slider'
import { Bar, BarChart, ResponsiveContainer, XAxis } from 'recharts'

interface YearSliderProps {
  yearDistribution: { [year: string]: number }
  yearRange: { min: number; max: number }
  value: [number, number]
  onChange: (value: [number, number]) => void
  originalYearDistribution?: { [year: string]: number } // Unfiltered distribution for full spectrum
}

interface CustomizedBarProps {
  x?: number
  y?: number
  width?: number
  height?: number
  payload?: { year: string; count?: number }
  fill?: string
  yearRange: { min: number; max: number }
  selectedRange: [number, number]
}

const CustomizedBar = (props: CustomizedBarProps) => {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    payload,
    fill,
    yearRange,
    selectedRange,
  } = props
  // Determine if this bar is within the selected range
  if (!payload) return null
  const yearNum = parseInt(payload.year, 10)
  const isSelected = yearNum >= selectedRange[0] && yearNum <= selectedRange[1]
  const barFill = isSelected ? '#009edb' : '#E2E4EA'
  if (payload.count === 0) {
    return (
      <rect
        x={x + width / 4}
        y={y + height - 1}
        width={width / 2}
        height={1}
        fill="hsl(var(--muted-foreground))"
        opacity={0.3}
      />
    )
  }
  return <rect x={x} y={y} width={width} height={height} fill={barFill} />
}

export function YearSlider({
  yearDistribution,
  yearRange,
  value,
  onChange,
  originalYearDistribution,
}: YearSliderProps) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const data = useMemo(() => {
    if (!yearRange) return []

    // Always use the full spectrum from 1946 to 2025, regardless of current filters
    const FULL_YEAR_RANGE = { min: 1946, max: 2025 }

    // Use original distribution if available, otherwise fall back to current distribution
    const distributionToUse = originalYearDistribution || yearDistribution

    const chartData = []
    const maxCount = Math.max(...Object.values(distributionToUse))

    // Always show the full spectrum
    for (let year = FULL_YEAR_RANGE.min; year <= FULL_YEAR_RANGE.max; year++) {
      const count = distributionToUse[year] || 0
      chartData.push({
        year: String(year),
        count: count,
        // Scale height so there's room for the slider
        displayHeight: count > 0 ? Math.max(5, (count / maxCount) * 80) : 0,
      })
    }
    return chartData
  }, [yearDistribution, originalYearDistribution, yearRange])

  const handleCommit = (committedValue: [number, number]) => {
    onChange(committedValue)
  }

  if (!yearRange) return null

  return (
    <div>
      <div className="relative h-16">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
            barGap={2}
          >
            <XAxis
              dataKey="year"
              axisLine={false}
              tickLine={false}
              tick={false}
            />
            <Bar
              dataKey="displayHeight"
              fill="hsl(var(--primary))"
              shape={(barProps: unknown) => (
                <CustomizedBar
                  {...(barProps as CustomizedBarProps)}
                  yearRange={yearRange}
                  selectedRange={localValue}
                />
              )}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="absolute right-0 bottom-0 left-0">
          <Slider
            min={1946}
            max={2025}
            step={1}
            value={localValue}
            onValueChange={(val: number[]) =>
              setLocalValue(val as [number, number])
            }
            onValueCommit={(val) => handleCommit(val as [number, number])}
            className="w-full **:data-radix-slider-range:bg-un-blue! **:data-radix-slider-thumb:border-un-blue! [&_.bg-primary]:bg-un-blue! [&_.border-primary]:border-un-blue!"
          />
        </div>
      </div>
      <div className="mt-2 flex justify-between text-sm text-muted-foreground">
        <span>{localValue[0]}</span>
        <span>{localValue[1]}</span>
      </div>
    </div>
  )
}
