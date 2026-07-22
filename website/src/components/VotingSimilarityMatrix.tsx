'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import type { VotingAnalysis } from '@/lib/data/country-votes'

// Compact display names for the narrow row-label gutter.
const SHORT_NAMES: Record<string, string> = {
  USA: 'United States',
  GBR: 'United Kingdom',
  RUS: 'Russia',
}

/**
 * Country × country voting-agreement heatmap for the "who votes with whom"
 * expander. Cell (A, B) is the share of GA plenary recorded votes (2015-
 * present) on which A and B cast the same vote (yes/no/abstain; absences
 * excluded). Both axes are ordered by the countries' latest Bailey/Strezhnev/
 * Voeten ideal point — US-aligned at the top-left, non-aligned at the
 * bottom-right — so voting blocs appear as bright blocks along the diagonal
 * without any clustering step baked into the data.
 *
 * 193×193 cells are far too many DOM nodes, so the matrix is drawn on a
 * canvas (sequential white → un-blue ramp, one hue, magnitude only). Hover
 * reads out the pair and its agreement; a handful of anchor countries are
 * labeled along the axes.
 */
export function VotingSimilarityMatrix({
  analysis,
}: {
  analysis: VotingAnalysis
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [hover, setHover] = useState<{
    a: string
    b: string
    value: number | null
  } | null>(null)

  const { order, matrix, countries, gaCoverage } = analysis
  const n = order.length

  // Anchor labels: recognisable countries along the axis. Candidates too
  // close to an already-kept anchor (under ~3.5% of the axis) are dropped so
  // labels never collide — e.g. USA/GBR/UKR all sit within the top few rows.
  const anchors = useMemo(() => {
    const wanted = [
      'USA',
      'GBR',
      'UKR',
      'JPN',
      'BRA',
      'IND',
      'ZAF',
      'CHN',
      'RUS',
      'CUB',
    ]
    const sorted = wanted
      .map((iso) => ({ iso, i: order.indexOf(iso) }))
      .filter((d) => d.i >= 0)
      .sort((a, b) => a.i - b.i)
    const minGap = order.length * 0.035
    const kept: typeof sorted = []
    for (const d of sorted) {
      if (kept.length === 0 || d.i - kept[kept.length - 1].i >= minGap) {
        kept.push(d)
      }
    }
    return kept
  }, [order])

  // Draw once per data change; CSS scales the canvas responsively.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = n
    canvas.height = n
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = ctx.createImageData(n, n)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = matrix[i][j]
        const p = (i * n + j) * 4
        if (v === null) {
          // No data: neutral light grey, distinct from low agreement.
          img.data[p] = img.data[p + 1] = img.data[p + 2] = 238
        } else {
          // White → un-blue-deep (#0090cc). Anchored at 40% because nearly
          // all pairs agree 40-100% (p5 = 48, median = 77): a 0-anchored ramp
          // renders the whole matrix mid-blue with no readable structure.
          const t = Math.max(0, Math.min(1, (v - 40) / 60))
          img.data[p] = Math.round(255 + (0 - 255) * t)
          img.data[p + 1] = Math.round(255 + (144 - 255) * t)
          img.data[p + 2] = Math.round(255 + (204 - 255) * t)
        }
        img.data[p + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
  }, [matrix, n])

  function onMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const j = Math.floor(((e.clientX - rect.left) / rect.width) * n)
    const i = Math.floor(((e.clientY - rect.top) / rect.height) * n)
    if (i < 0 || j < 0 || i >= n || j >= n) return setHover(null)
    setHover({ a: order[i], b: order[j], value: matrix[i][j] })
  }

  return (
    <div>
      <p className="mb-3 max-w-3xl text-sm text-gray-500">
        How often two countries voted the same way (yes, no, abstain) across the{' '}
        {gaCoverage.votes.toLocaleString()} recorded General Assembly plenary
        votes {gaCoverage.from}–{gaCoverage.to}. Both axes run from the most
        US-aligned countries (top left) to the least aligned (bottom right),
        ordered by the Bailey–Strezhnev–Voeten ideal point, so voting blocs
        appear as dark blocks. Darker blue = more agreement; light grey cells
        lack enough common votes.
      </p>

      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-16 rounded-sm"
            style={{
              background: 'linear-gradient(to right, #ffffff, #0090cc)',
              boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 0.08)',
            }}
          />
          ≤40% → 100% voting agreement
        </span>
        <span className="ml-auto text-gray-500">
          {hover ? (
            <span>
              <span className="font-medium text-gray-900">
                {countries[hover.a]} × {countries[hover.b]}
              </span>
              {' — '}
              {hover.value === null ? (
                'too few common votes'
              ) : (
                <span className="font-medium text-un-blue">
                  {hover.value}% agreement
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-400">Hover the matrix for a pair</span>
          )}
        </span>
      </div>

      <div className="flex gap-2">
        {/* Row anchor labels */}
        <div className="relative w-20 shrink-0 text-right text-[10px] text-gray-500">
          {anchors.map((a) => (
            <span
              key={a.iso}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${((a.i + 0.5) / n) * 100}%` }}
            >
              {SHORT_NAMES[a.iso] ?? countries[a.iso] ?? a.iso}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <canvas
            ref={canvasRef}
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            className="aspect-square w-full max-w-xl cursor-crosshair rounded-sm border border-gray-200"
            style={{ imageRendering: 'pixelated' }}
          />
          {/* Column anchor labels — hidden on narrow screens where the ISO
              codes would collide; the row labels still anchor the axis. */}
          <div className="relative mt-1 hidden h-4 w-full max-w-xl text-[10px] text-gray-500 sm:block">
            {anchors.map((a) => (
              <span
                key={a.iso}
                className="absolute -translate-x-1/2"
                style={{ left: `${((a.i + 0.5) / n) * 100}%` }}
              >
                {a.iso}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-2 max-w-3xl text-xs text-gray-500">
        Sources: UN Digital Library Voting Data collection (votes); Bailey,
        Strezhnev &amp; Voeten ideal point estimates (axis order). Security
        Council and Human Rights Council votes are not included in this matrix.
      </p>
    </div>
  )
}
