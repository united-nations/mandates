'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { Bar, BarChart, ResponsiveContainer, XAxis } from 'recharts';

interface YearSliderProps {
  yearDistribution: { [year: string]: number };
  yearRange: { min: number; max: number };
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

const CustomizedBar = (props: any) => {
    const { x, y, width, height, payload, fill, yearRange, selectedRange } = props;
    // Determine if this bar is within the selected range
    const yearNum = parseInt(payload.year, 10);
    const isSelected = yearNum >= selectedRange[0] && yearNum <= selectedRange[1];
    const barFill = isSelected ? 'var(--un-blue)' : '#747B8D';
    if (payload.count === 0) {
        return <rect x={x + width / 4} y={y + height -1} width={width / 2} height={1} fill="hsl(var(--muted-foreground))" opacity={0.3} />;
    }
    return <rect x={x} y={y} width={width} height={height} fill={barFill} />;
};

export function YearSlider({ yearDistribution, yearRange, value, onChange }: YearSliderProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const data = useMemo(() => {
    if (!yearDistribution || !yearRange) return [];
    const chartData = [];
    const maxCount = Math.max(...Object.values(yearDistribution));
    for (let year = yearRange.min; year <= yearRange.max; year++) {
      const count = yearDistribution[year] || 0;
      chartData.push({
        year: String(year),
        count: count,
        // Scale height so there's room for the slider
        displayHeight: count > 0 ? Math.max(5, (count / maxCount) * 80) : 0,
      });
    }
    return chartData;
  }, [yearDistribution, yearRange]);

  const handleCommit = (committedValue: [number, number]) => {
    onChange(committedValue);
  };
  
  if (!yearRange) return null;

  return (
    <div>
      <div className="relative h-16">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }} barGap={2}>
            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={false} />
            <Bar dataKey="displayHeight" fill="hsl(var(--primary))" shape={
              (barProps: any) => <CustomizedBar {...barProps} yearRange={yearRange} selectedRange={localValue} />
            } isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
        <div className="absolute bottom-0 left-0 right-0 px-[10px]">
          <Slider
            min={yearRange.min}
            max={yearRange.max}
            step={1}
            value={localValue}
            onValueChange={(val: number[]) => setLocalValue(val as [number, number])}
            onValueCommit={(val) => handleCommit(val as [number, number])}
            className="w-full"
          />
        </div>
      </div>
      <div className="flex justify-between text-sm text-muted-foreground mt-2 px-[10px]">
        <span>{localValue[0]}</span>
        <span>{localValue[1]}</span>
      </div>
    </div>
  );
}