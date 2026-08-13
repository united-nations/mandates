'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import type { ChainDetail, ChainSummary } from '@/lib/genealogy'

/**
 * "Chain DNA": one renewal chain laid out as a grid. Rows are the resolutions
 * in time order (oldest at top); columns are paragraph lineages ordered by the
 * year they were born. A cell is coloured by status — verbatim (dark blue),
 * mutated (light blue), new (neutral) — so a paragraph that survives verbatim
 * for decades reads as a solid dark vertical band, and a year that rewrites
 * itself reads as a pale row. A paragraph's last appearance carries a marker
 * edge. Short-lived one-off paragraphs are folded out of the grid and counted.
 */

const CELL = 11
const GAP = 1
const ROW_H = CELL + GAP
const LABEL_W = 96

function statusColor(code: string): string {
  const base = code[0]
  if (base === 'v') return 'var(--color-geneal-verbatim)'
  if (base === 'm') return 'var(--color-geneal-mutated)'
  return 'var(--color-geneal-new)'
}

function statusName(code: string): string {
  const base = code[0]
  if (base === 'v') return 'Verbatim — copied word-for-word from the previous resolution'
  if (base === 'm') return 'Mutated — the same clause, reworded or re-dated'
  return 'New — first appears in this resolution'
}

interface HoverCell {
  docIdx: number
  colIdx: number
}

export function ChainDNA({
  detail,
  chainId,
  options,
}: {
  detail: ChainDetail
  chainId: string
  options: ChainSummary[]
}) {
  const router = useRouter()
  const [hover, setHover] = useState<HoverCell | null>(null)

  const { columns, docs } = detail
  const nCols = columns.length
  const gridW = nCols * ROW_H
  const gridH = docs.length * ROW_H

  const totalSingles = useMemo(
    () => docs.reduce((s, d) => s + d.singles, 0),
    [docs]
  )

  const hoverCol = hover ? columns[hover.colIdx] : null
  const hoverDoc = hover ? docs[hover.docIdx] : null
  const hoverCode = hover ? docs[hover.docIdx].row[String(hover.colIdx)] : null

  return (
    <div>
      {/* chain picker */}
      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-gray-500">
          Renewal chain
        </label>
        <select
          value={chainId}
          onChange={(e) => {
            const params = new URLSearchParams()
            params.set('chain', e.target.value)
            router.push(`/genealogy?${params.toString()}#dna`, {
              scroll: false,
            })
          }}
          className="w-full max-w-xl rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-un-blue focus:ring-1 focus:ring-un-blue focus:outline-none"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.body} · {o.docType} — {o.title} ({o.firstYear}–{o.lastYear},{' '}
              {o.nDocs} docs)
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <h4 className="text-sm font-semibold text-gray-900">
          {detail.title.charAt(0).toUpperCase() + detail.title.slice(1)}
        </h4>
        <p className="text-xs text-gray-500">
          {detail.body} · {detail.docType} · {docs.length} resolutions ·{' '}
          {nCols} recurring paragraph lineages
          {totalSingles > 0 &&
            ` · ${totalSingles} one-off paragraphs folded out`}
        </p>
      </div>

      {/* grid: fixed label column + horizontally scrollable cells */}
      <div className="flex">
        <div
          className="shrink-0"
          style={{ width: LABEL_W }}
          aria-hidden
        >
          <div style={{ height: 0 }} />
          {docs.map((d, i) => {
            const pct = detail.perDoc[i]
            const isHoverRow = hover?.docIdx === i
            return (
              <div
                key={i}
                className={`flex items-center justify-between pr-2 text-[10px] ${
                  isHoverRow ? 'text-gray-900' : 'text-gray-500'
                }`}
                style={{ height: ROW_H }}
              >
                <span className="tabular-nums">{d.year}</span>
                {pct && i > 0 && (
                  <span
                    className="tabular-nums"
                    style={{ color: 'var(--color-geneal-verbatim)' }}
                    title="carried over from the previous resolution"
                  >
                    {Math.round(pct.carriedpct)}%
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div className="overflow-x-auto">
          <svg
            width={Math.max(gridW, 1)}
            height={gridH}
            className="block"
            role="img"
            aria-label={`DNA grid of ${detail.title}: ${docs.length} resolutions by ${nCols} paragraph lineages`}
            onMouseLeave={() => setHover(null)}
          >
            {docs.map((d, di) =>
              columns.map((_, ci) => {
                const code = d.row[String(ci)]
                if (!code) return null
                const isHover =
                  hover?.docIdx === di && hover?.colIdx === ci
                return (
                  <g key={`${di}-${ci}`}>
                    <rect
                      x={ci * ROW_H}
                      y={di * ROW_H}
                      width={CELL}
                      height={CELL}
                      rx={1.5}
                      fill={statusColor(code)}
                      stroke={isHover ? '#143c52' : 'none'}
                      strokeWidth={isHover ? 1.5 : 0}
                    />
                    {code.includes('e') && (
                      <rect
                        x={ci * ROW_H}
                        y={di * ROW_H + CELL - 2}
                        width={CELL}
                        height={2}
                        rx={1}
                        fill="var(--color-geneal-marker)"
                      />
                    )}
                  </g>
                )
              })
            )}
            {/* transparent hover targets on the whole band so empty cells
                don't swallow the pointer between marks */}
            {docs.map((d, di) =>
              columns.map((_, ci) =>
                d.row[String(ci)] ? (
                  <rect
                    key={`h-${di}-${ci}`}
                    x={ci * ROW_H}
                    y={di * ROW_H}
                    width={ROW_H}
                    height={ROW_H}
                    fill="transparent"
                    onMouseEnter={() =>
                      setHover({ docIdx: di, colIdx: ci })
                    }
                  />
                ) : null
              )
            )}
          </svg>
        </div>
      </div>

      {/* legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
        <Swatch c="var(--color-geneal-verbatim)" label="Verbatim" />
        <Swatch c="var(--color-geneal-mutated)" label="Mutated" />
        <Swatch c="var(--color-geneal-new)" label="New" />
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-[2px] border-b-2"
            style={{ borderColor: 'var(--color-geneal-marker)' }}
          />
          <span>Last appearance</span>
        </span>
      </div>

      {/* hover readout */}
      <div className="mt-3 min-h-[4.5rem] rounded-md border border-gray-200 bg-card-gray p-3 text-xs">
        {hover && hoverCol && hoverDoc && hoverCode ? (
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span
                className="font-semibold"
                style={{ color: statusColor(hoverCode) }}
              >
                {statusName(hoverCode)}
                {hoverCode.includes('e') && ' · last appearance'}
              </span>
              <span className="text-gray-400">
                {hoverDoc.symbol} ({hoverDoc.year})
              </span>
            </div>
            <p className="mb-1 text-gray-700">“{hoverCol.snippet}”</p>
            <p className="text-gray-400">
              This paragraph lineage first appeared in {hoverCol.born}, last in{' '}
              {hoverCol.last} — present in {hoverCol.nDocs} of {docs.length}{' '}
              resolutions.
            </p>
          </div>
        ) : (
          <span className="text-gray-400">
            Hover a cell to read the paragraph and its lineage. Left column shows
            each resolution&apos;s year and the share carried over from the one
            before it.
          </span>
        )}
      </div>
    </div>
  )
}

function Swatch({ c, label }: { c: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-[2px]"
        style={{ backgroundColor: c }}
      />
      <span>{label}</span>
    </span>
  )
}
