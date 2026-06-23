'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CitationMatrixHeatmap,
  type HeatmapMode,
} from './CitationMatrixHeatmap'
import type { CitationMatrixData } from '@/lib/data/citation-matrix'

const MODE_LABELS: Record<HeatmapMode, string> = {
  ppb2026: '2026',
  ppb2027: '2027',
  diff: 'Difference (2027 − 2026)',
}

export function CitationMatrixView({ data }: { data: CitationMatrixData }) {
  const [mode, setMode] = useState<HeatmapMode>('ppb2026')

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as HeatmapMode)}>
        <TabsList>
          <TabsTrigger value="ppb2026">{MODE_LABELS.ppb2026}</TabsTrigger>
          <TabsTrigger value="ppb2027">{MODE_LABELS.ppb2027}</TabsTrigger>
          <TabsTrigger value="diff">{MODE_LABELS.diff}</TabsTrigger>
        </TabsList>
      </Tabs>
      <CitationMatrixHeatmap data={data} mode={mode} />
    </div>
  )
}
