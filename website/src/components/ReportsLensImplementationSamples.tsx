'use client'

import { useState } from 'react'
import { ExternalLink, FileText } from 'lucide-react'
import Link from 'next/link'
import { getMandateUrl } from '@/components/table/MandateColumns'
import type {
  ImplementationSample,
  ImplementationStatus,
} from '@/lib/data/report-implementation'
import { IMPLEMENTATION_STATUS_LABELS } from '@/lib/data/report-implementation'

/**
 * "Request → response" alignment view for the curated implementation samples:
 * left column = the individual deliverables extracted from a resolution's
 * requesting paragraphs, right column = what the delivered report actually
 * says about each, status-labelled and quote-grounded. Samples only — the
 * section header on /reports carries the coverage disclaimer.
 */

// Semantic status colors; labels always accompany color (never color alone).
const STATUS_STYLES: Record<
  ImplementationStatus,
  { badge: string; border: string }
> = {
  addressed: {
    badge: 'bg-emerald-50 text-emerald-700',
    border: 'border-emerald-500/60',
  },
  partial: {
    badge: 'bg-amber-50 text-amber-700',
    border: 'border-amber-500/60',
  },
  mention: { badge: 'bg-sky-50 text-sky-700', border: 'border-sky-500/50' },
  silent: { badge: 'bg-gray-100 text-gray-600', border: 'border-gray-300' },
}

function StatusBadge({ status }: { status: ImplementationStatus }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_STYLES[status].badge}`}
    >
      {IMPLEMENTATION_STATUS_LABELS[status]}
    </span>
  )
}

export function ReportsLensImplementationSamples({
  samples,
}: {
  samples: ImplementationSample[]
}) {
  const [selected, setSelected] = useState(0)
  const sample = samples[selected]
  if (!sample) return null

  return (
    <div>
      {/* Sample selector */}
      <div className="flex flex-wrap gap-2">
        {samples.map((s, i) => (
          <button
            key={s.resolution}
            onClick={() => setSelected(i)}
            className={`rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors ${
              i === selected
                ? 'border-un-blue bg-blue-50/60 text-gray-900'
                : 'border-gray-200 text-gray-600 hover:border-un-blue/50'
            }`}
          >
            <span className="block font-medium">{s.topic}</span>
            <span className="mt-0.5 block font-mono text-[10px] text-gray-400">
              {s.resolution} → {s.report.symbol}
            </span>
          </button>
        ))}
      </div>

      {/* Selected pair header */}
      <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Link
          href={getMandateUrl(sample.resolution)}
          className="font-mono text-sm font-medium text-un-blue hover:underline"
        >
          {sample.resolution}
        </Link>
        <span className="text-sm text-gray-500">
          {sample.resolutionTitle} ({sample.year})
        </span>
        <span className="text-gray-300">→</span>
        <a
          href={`https://digitallibrary.un.org/record/${sample.report.recid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-sm font-medium text-un-blue hover:underline"
        >
          <FileText className="h-3.5 w-3.5" />
          {sample.report.symbol}
          <ExternalLink className="h-3 w-3" />
        </a>
        <span className="text-xs text-gray-400">
          {sample.report.date ? `published ${sample.report.date}` : ''}
        </span>
      </div>

      {/* Column headers (desktop) */}
      <div className="mt-4 hidden grid-cols-2 gap-6 border-b border-gray-200 pb-1 text-[11px] font-medium text-gray-400 uppercase lg:grid">
        <span>The resolution asks…</span>
        <span>…the report responds</span>
      </div>

      {/* Mapping rows */}
      <ul className="divide-y divide-gray-100">
        {sample.mappings.map((m, i) => (
          <li key={i} className="grid gap-3 py-4 lg:grid-cols-2 lg:gap-6">
            {/* Request side */}
            <div>
              <p className="text-sm font-medium text-gray-900">
                <span className="mr-2 font-mono text-xs text-gray-400">
                  ¶ {m.para}
                </span>
                {m.deliverable}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-500 italic">
                “{m.requestClause}”
              </p>
            </div>
            {/* Response side */}
            <div
              className={`border-l-2 pl-3 ${STATUS_STYLES[m.status].border}`}
            >
              <div className="flex items-center gap-2">
                <StatusBadge status={m.status} />
                {m.reportLocations.length > 0 && (
                  <span className="text-[11px] text-gray-400">
                    {m.reportLocations.join(' · ')}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-700">
                {m.summary}
              </p>
              {m.quote && (
                <details className="group mt-1.5">
                  <summary className="cursor-pointer list-none text-[11px] font-medium text-un-blue hover:underline">
                    <span className="group-open:hidden">Show quote</span>
                    <span className="hidden group-open:inline">Hide quote</span>
                  </summary>
                  <blockquote className="mt-1.5 border-l-2 border-gray-200 pl-2.5 text-xs leading-relaxed text-gray-500 italic">
                    “{m.quote}”
                  </blockquote>
                </details>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
