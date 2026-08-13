'use client'

import { useState } from 'react'

import {
  STATUS_META,
  type MissionTargetPeriod,
  type TargetRecord,
  type TargetStatus,
} from '@/lib/mission-targets'

/**
 * Per-mission, an expandable breakdown of results-based-budgeting targets grouped
 * by met / partially met / not met, each with a one-line reason grounded in the
 * planned-vs-actual numbers. Classification: see docs/lens-impact/ANALYSIS.md.
 */

export interface MissionTargetsEntry {
  acronym: string
  name: string
  location: string
  latest: MissionTargetPeriod
}

const STATUS_SEQUENCE: TargetStatus[] = [
  'not_met',
  'partial',
  'met',
  'not_assessable',
]

/** Segmented bar showing the met/partial/not-met split for one mission-period. */
function StatusBar({ counts }: { counts: Record<TargetStatus, number> }) {
  const total = STATUS_SEQUENCE.reduce((s, k) => s + counts[k], 0)
  if (total === 0) return null
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full">
      {STATUS_SEQUENCE.map((k) =>
        counts[k] > 0 ? (
          <div
            key={k}
            style={{
              width: `${(counts[k] / total) * 100}%`,
              backgroundColor: STATUS_META[k].color,
              boxShadow: '1px 0 0 var(--color-background)',
            }}
            title={`${counts[k]} ${STATUS_META[k].label.toLowerCase()}`}
          />
        ) : null
      )}
    </div>
  )
}

function fmtValue(r: TargetRecord): string {
  return r.reason
}

function TargetRow({ r }: { r: TargetRecord }) {
  return (
    <li className="flex items-baseline gap-2 py-1">
      <span
        aria-hidden
        className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: STATUS_META[r.status].color }}
      />
      <span className="text-sm text-gray-700">
        <span className="font-medium text-gray-900">{r.desc}</span>
        <span className="text-gray-400"> · {r.indicator}</span>
        <span className="mt-0.5 block text-xs text-gray-500">
          {fmtValue(r)}
        </span>
      </span>
    </li>
  )
}

function MissionCard({ entry }: { entry: MissionTargetsEntry }) {
  const [open, setOpen] = useState(false)
  const { counts, records, period } = entry.latest
  const total = records.length
  const grouped = STATUS_SEQUENCE.map((status) => ({
    status,
    rows: records.filter((r) => r.status === status),
  })).filter((g) => g.rows.length > 0)

  return (
    <div className="border-b border-border/60 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="w-20 shrink-0 text-sm font-semibold text-gray-900">
          {entry.acronym}
        </span>
        <span className="hidden w-40 shrink-0 truncate text-xs text-gray-500 sm:block">
          {entry.location}
        </span>
        <span className="hidden max-w-40 flex-1 sm:block">
          <StatusBar counts={counts} />
        </span>
        <span className="ml-auto shrink-0 text-right text-xs text-gray-500">
          <span className="font-medium text-un-blue">{counts.met}</span> met
          {counts.partial > 0 && (
            <>
              {' · '}
              <span className="font-medium text-gray-700">
                {counts.partial}
              </span>{' '}
              part.
            </>
          )}
          {' · '}
          <span className="font-medium text-au-chico">
            {counts.not_met}
          </span>{' '}
          missed
          <span className="text-gray-400"> of {total}</span>
        </span>
        <span
          aria-hidden
          className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}
        >
          ›
        </span>
      </button>

      {/* mobile-only status bar under the header */}
      <div className="mt-2 sm:hidden">
        <StatusBar counts={counts} />
      </div>

      {open && (
        <div className="mt-3 pl-1 sm:pl-23">
          <div className="mb-2 text-xs text-gray-400">
            Results-based-budgeting indicators, {period}
          </div>
          {grouped.map((g) => (
            <div key={g.status} className="mb-3">
              <div
                className="mb-1 text-xs font-semibold"
                style={{ color: STATUS_META[g.status].color }}
              >
                {STATUS_META[g.status].label} ({g.rows.length})
              </div>
              <ul className="space-y-0.5">
                {g.rows.map((r) => (
                  <TargetRow key={r.id} r={r} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function MissionTargets({
  entries,
  totals,
}: {
  entries: MissionTargetsEntry[]
  totals: Record<TargetStatus, number>
}) {
  const grandTotal = STATUS_SEQUENCE.reduce((s, k) => s + totals[k], 0)
  return (
    <div>
      {/* portfolio legend + totals */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-600">
        {STATUS_SEQUENCE.filter((k) => totals[k] > 0).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: STATUS_META[k].color }}
            />
            <span className="font-medium text-gray-900">{totals[k]}</span>{' '}
            {STATUS_META[k].label.toLowerCase()}
          </span>
        ))}
        <span className="text-gray-400">
          across {grandTotal.toLocaleString('en-US')}
          {' indicators in each mission’s latest reported period'}
        </span>
      </div>
      <div>
        {entries.map((e) => (
          <MissionCard key={e.acronym} entry={e} />
        ))}
      </div>
    </div>
  )
}
