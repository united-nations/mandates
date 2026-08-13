'use client'

import {
  DIFF_NEGATIVE_COLOR,
  DIFF_POSITIVE_COLOR,
  DIFF_ZERO_COLOR,
  GROUP_COLOR,
  GROUP_ORDER,
} from '@/lib/citation-matrix-constants'
import type { CitationMatrixData } from '@/lib/data/citation-matrix'

export type HeatmapMode = 'ppb2026' | 'ppb2027' | 'diff'

type Props = {
  data: CitationMatrixData
  mode: HeatmapMode
}

const CELL = 14
const LABEL_PX = 70
const FONT = 9

export function CitationMatrixHeatmap({ data, mode }: Props) {
  const { entities, matrices } = data
  const n = entities.length
  if (n === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No entities available for the matrix.
      </p>
    )
  }

  const values: number[][] =
    mode === 'diff'
      ? matrices.ppb2027.map((row, i) =>
          row.map((v, j) => v - matrices.ppb2026[i][j]),
        )
      : matrices[mode]

  // Use max off-diagonal value for scaling so the (usually huge) diagonal
  // doesn't flatten every other cell to near-zero.
  const offDiagMagnitudes: number[] = []
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue
      offDiagMagnitudes.push(Math.abs(values[i][j]))
    }
  }
  const maxMag = offDiagMagnitudes.reduce((a, b) => Math.max(a, b), 0) || 1

  const colorFor = (i: number, j: number): string => {
    const v = values[i][j]
    if (mode === 'diff') {
      if (v === 0) return DIFF_ZERO_COLOR
      const t = Math.min(1, Math.abs(v) / maxMag)
      const base = v > 0 ? DIFF_POSITIVE_COLOR : DIFF_NEGATIVE_COLOR
      return mixWithWhite(base, t)
    }
    if (v === 0) return '#ffffff'
    const groupColor = GROUP_COLOR[entities[i].group]
    // Slight floor so non-zero cells are visibly tinted.
    const t = 0.15 + 0.85 * Math.min(1, Math.log1p(v) / Math.log1p(maxMag))
    return mixWithWhite(groupColor, t)
  }

  const groupBoundaries: number[] = []
  for (let i = 1; i < n; i++) {
    if (entities[i].group !== entities[i - 1].group) groupBoundaries.push(i)
  }

  const width = LABEL_PX + n * CELL + 8
  const height = LABEL_PX + n * CELL + 8

  return (
    <div className="space-y-4">
      <GroupLegend />
      <div className="overflow-x-auto">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Cross-citation matrix"
          style={{ display: 'block' }}
        >
          {/* Column labels (rotated above the matrix). */}
          {entities.map((e, j) => (
            <text
              key={`col-${e.entity}`}
              x={LABEL_PX + j * CELL + CELL / 2}
              y={LABEL_PX - 4}
              transform={`rotate(-60 ${LABEL_PX + j * CELL + CELL / 2} ${LABEL_PX - 4})`}
              textAnchor="start"
              fontSize={FONT}
              fill={GROUP_COLOR[e.group]}
              fontWeight={500}
            >
              {e.entity}
            </text>
          ))}

          {/* Row labels (right-aligned to the matrix). */}
          {entities.map((e, i) => (
            <text
              key={`row-${e.entity}`}
              x={LABEL_PX - 4}
              y={LABEL_PX + i * CELL + CELL / 2 + FONT / 3}
              textAnchor="end"
              fontSize={FONT}
              fill={GROUP_COLOR[e.group]}
              fontWeight={500}
            >
              {e.entity}
            </text>
          ))}

          {/* Cells. */}
          <g>
            {entities.map((rowE, i) =>
              entities.map((colE, j) => {
                const v = values[i][j]
                const diff =
                  mode === 'diff'
                    ? v
                    : matrices.ppb2027[i][j] - matrices.ppb2026[i][j]
                const title =
                  mode === 'diff'
                    ? `${rowE.entity} × ${colE.entity}: Δ ${formatSigned(v)} docs (2026: ${matrices.ppb2026[i][j]}, 2027: ${matrices.ppb2027[i][j]})`
                    : `${rowE.entity} × ${colE.entity}: ${v} docs (Δ ${formatSigned(diff)})`
                return (
                  <rect
                    key={`${i}-${j}`}
                    x={LABEL_PX + j * CELL}
                    y={LABEL_PX + i * CELL}
                    width={CELL}
                    height={CELL}
                    fill={colorFor(i, j)}
                    stroke="#f3f4f6"
                    strokeWidth={0.5}
                  >
                    <title>{title}</title>
                  </rect>
                )
              }),
            )}
          </g>

          {/* Group separator lines (drawn on top of cells). */}
          <g pointerEvents="none">
            {groupBoundaries.map((b) => (
              <g key={`sep-${b}`}>
                <line
                  x1={LABEL_PX}
                  x2={LABEL_PX + n * CELL}
                  y1={LABEL_PX + b * CELL}
                  y2={LABEL_PX + b * CELL}
                  stroke="#1f2937"
                  strokeWidth={0.8}
                />
                <line
                  x1={LABEL_PX + b * CELL}
                  x2={LABEL_PX + b * CELL}
                  y1={LABEL_PX}
                  y2={LABEL_PX + n * CELL}
                  stroke="#1f2937"
                  strokeWidth={0.8}
                />
              </g>
            ))}
            {/* Outer frame */}
            <rect
              x={LABEL_PX}
              y={LABEL_PX}
              width={n * CELL}
              height={n * CELL}
              fill="none"
              stroke="#1f2937"
              strokeWidth={0.8}
            />
          </g>
        </svg>
      </div>
      <ValueLegend mode={mode} maxMag={maxMag} />
    </div>
  )
}

function GroupLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      {GROUP_ORDER.map((g) => (
        <span key={g} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ background: GROUP_COLOR[g] }}
          />
          <span className="text-foreground/80">{g}</span>
        </span>
      ))}
    </div>
  )
}

function ValueLegend({
  mode,
  maxMag,
}: {
  mode: HeatmapMode
  maxMag: number
}) {
  const stops = 7
  const items = Array.from({ length: stops }, (_, k) => k / (stops - 1))

  if (mode === 'diff') {
    return (
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>−{maxMag}</span>
        <div className="flex h-3 w-48 overflow-hidden rounded-sm border border-border">
          {items.map((t) => {
            const left = (1 - t) * 2 - 1
            const color =
              left === 0
                ? DIFF_ZERO_COLOR
                : mixWithWhite(
                    left > 0 ? DIFF_POSITIVE_COLOR : DIFF_NEGATIVE_COLOR,
                    Math.abs(left),
                  )
            return <span key={t} className="flex-1" style={{ background: color }} />
          })}
        </div>
        <span>+{maxMag}</span>
        <span className="ml-2">cross-citation change (2027 − 2026)</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span>0</span>
      <div className="flex h-3 w-48 overflow-hidden rounded-sm border border-border">
        {items.map((t) => (
          <span
            key={t}
            className="flex-1"
            style={{ background: mixWithWhite('#5a6c7d', 0.15 + 0.85 * t) }}
          />
        ))}
      </div>
      <span>{maxMag}</span>
      <span className="ml-2">shared source documents</span>
    </div>
  )
}

function mixWithWhite(hex: string, t: number): string {
  // t=0 → white, t=1 → base color. Linear in sRGB; good enough for a heatmap.
  const { r, g, b } = hexToRgb(hex)
  const mix = (c: number) => Math.round(255 + (c - 255) * t)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function formatSigned(v: number): string {
  if (v === 0) return '0'
  return v > 0 ? `+${v}` : `${v}`
}
