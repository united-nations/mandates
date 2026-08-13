import samplesJson from '@/data/report-implementation-samples.json'

/**
 * Typed accessor for the curated "request → response" implementation samples
 * (src/data/report-implementation-samples.json).
 *
 * For nine representative resolution→report pairs from the reports lens, each
 * requesting paragraph was decomposed into individual deliverables and mapped
 * by hand against the full text of the delivered report, with verbatim quotes
 * as evidence. These are curated samples, not full coverage — the UI must say
 * so. Method and accuracy notes: docs/lens-reports/ANALYSIS.md.
 */

/** How the report responds to one individual request/deliverable. */
export type ImplementationStatus = 'addressed' | 'partial' | 'mention' | 'silent'

export const IMPLEMENTATION_STATUS_LABELS: Record<ImplementationStatus, string> =
  {
    addressed: 'Addressed',
    partial: 'Partially addressed',
    mention: 'Covered by reference',
    silent: 'Not covered',
  }

export const IMPLEMENTATION_STATUS_ORDER: ImplementationStatus[] = [
  'addressed',
  'partial',
  'mention',
  'silent',
]

export interface RequestResponseMapping {
  /** Operative paragraph number in the resolution (as printed). */
  para: string
  /** Short label for the individual deliverable within the paragraph. */
  deliverable: string
  /** The specific requesting clause, quoted from the resolution. */
  requestClause: string
  status: ImplementationStatus
  /** Where in the report the response lives (paragraph/section citations). */
  reportLocations: string[]
  /** 1–2 sentence quote-grounded summary of what the report says. */
  summary: string
  /** Verbatim quote from the report (verified against the source text). */
  quote: string | null
}

export interface ImplementationSample {
  resolution: string
  resolutionTitle: string | null
  body: string | null
  year: number | null
  /** Short topic label for the sample selector. */
  topic: string
  report: {
    symbol: string
    recid: number
    title: string | null
    date: string | null
  }
  /** Full text of each requesting paragraph, for expandable display. */
  requestParagraphs: { prefix: string; text: string }[]
  mappings: RequestResponseMapping[]
}

interface SamplesFile {
  generatedAt: string
  method: string
  samples: ImplementationSample[]
}

const file = samplesJson as unknown as SamplesFile

export function getImplementationSamples(): ImplementationSample[] {
  return file.samples
}

const normalizeSymbol = (s: string) => s.toUpperCase().replace(/\s+/g, '')

/** True when a curated request→response sample exists for this resolution. */
export function hasImplementationSample(documentSymbol: string): boolean {
  const key = normalizeSymbol(documentSymbol)
  return file.samples.some((s) => normalizeSymbol(s.resolution) === key)
}

/** Aggregate status counts across all sampled mappings (for the intro strip). */
export function getImplementationStatusCounts(): Record<
  ImplementationStatus,
  number
> {
  const counts: Record<ImplementationStatus, number> = {
    addressed: 0,
    partial: 0,
    mention: 0,
    silent: 0,
  }
  for (const s of file.samples)
    for (const m of s.mappings) counts[m.status] += 1
  return counts
}
