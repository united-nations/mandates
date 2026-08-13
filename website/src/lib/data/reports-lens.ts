import lensJson from '@/data/reports-lens.json'

/**
 * Typed accessor over the precomputed "mandates → reports" lens
 * (src/data/reports-lens.json, built by scripts/build-reports-lens.mjs).
 *
 * The lens links two sides of the reporting cycle inside the mandate registry:
 *  - REQUESTS: operative paragraphs of resolutions that ask an official or
 *    body to report (with addressee and frequency),
 *  - REPORTS: Digital Library report records whose "submitted pursuant to …"
 *    notes name the requesting resolution.
 *
 * The JSON is static and bundled server-side; import this module only from
 * Server Components. Precision/coverage figures are documented in
 * docs/lens-reports/ANALYSIS.md.
 */

/** How often a requested report is due, classified from the paragraph text. */
export type ReportFrequency =
  | 'monthly'
  | 'quarterly'
  | 'semiannual'
  | 'annual'
  | 'biennial'
  | 'session'
  | 'regular'
  | 'unspecified'

/** Human-readable labels for {@link ReportFrequency}, in periodicity order. */
export const FREQUENCY_LABELS: Record<ReportFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semiannual: 'Every six months',
  annual: 'Annual',
  biennial: 'Biennial',
  session: 'At a specific session',
  regular: 'Regularly / keep informed',
  unspecified: 'No stated frequency',
}

export const FREQUENCY_ORDER: ReportFrequency[] = [
  'monthly',
  'quarterly',
  'semiannual',
  'annual',
  'biennial',
  'session',
  'regular',
  'unspecified',
]

/** One reporting obligation extracted from a resolution paragraph. */
export interface ReportingRequest {
  /** Paragraph position within the parsed document. */
  position: number
  /** Operative paragraph number as printed (e.g. "8"), when known. */
  para: string | null
  /** The requesting verb ("Requests", "Invites", …). */
  verb: string
  /** Who is asked to report (canonicalized), when recognized. */
  addressee: string | null
  frequency: ReportFrequency
  /** The paragraph text, truncated to ~320 chars. */
  excerpt: string
}

/** One delivered report linked back to a resolution via its pursuant note. */
export interface DeliveredReport {
  /** UN document symbol of the report (e.g. "A/79/301"). */
  symbol: string
  /** UN Digital Library record id — links to digitallibrary.un.org/record/… */
  recid: number
  title: string | null
  /** Publication date (ISO yyyy-mm-dd), when known. */
  date: string | null
  /** The verbatim "submitted pursuant to …" statement that carries the link. */
  note: string | null
  /** Jaccard overlap of UNBIS subjects between report and resolution (0–1). */
  topicOverlap: number | null
}

/** Both sides of the lens for one resolution in the mandate registry. */
export interface ResolutionReportsLens {
  title: string | null
  year: number | null
  body: string | null
  requests: ReportingRequest[]
  reports: DeliveredReport[]
}

export interface ReportsLensStats {
  generatedAt: string
  /** Reporting-request paragraphs found across parsed resolutions. */
  requestParagraphs: number
  /** Distinct resolutions containing at least one reporting request. */
  resolutionsWithRequests: number
  /** Resolutions with paragraph parses (the denominator for requests). */
  parsedResolutionDocs: number
  /** DL report records with at least one parsed resolution link. */
  deliveredReports: number
  /** report→resolution edges parsed from pursuant notes. */
  deliveredLinkEdges: number
  /** … of which point at a resolution known to the mandate registry. */
  deliveredLinkEdgesInRegistry: number
  /** Resolutions that have both a detected request and ≥1 linked report. */
  requestsMatchedToReports: number
  /** requestsMatchedToReports / resolutionsWithRequests. */
  requestMatchRate: number
  /** deliveredLinkEdgesInRegistry / deliveredLinkEdges. */
  linkEdgeRegistryRate: number
  topicOverlap: { n: number; median: number | null; p25: number | null; p75: number | null }
  frequencies: Partial<Record<ReportFrequency, number>>
  addressees: Record<string, number>
  byBody: Record<
    string,
    { requests: number; reports: number; resolutionsWithRequests: number }
  >
  reportsPerYear: Record<string, number>
}

interface ReportsLensFile {
  stats: ReportsLensStats
  resolutions: Record<string, ResolutionReportsLens>
}

// The JSON is too large for useful literal-type inference; the shape is
// guaranteed by the builder script, which this module mirrors.
const lens = lensJson as unknown as ReportsLensFile

const normalizeSymbol = (s: string) => s.toUpperCase().replace(/\s+/g, '')

// Lazy index: normalized document symbol → registry symbol.
let symbolIndex: Map<string, string> | null = null
function getSymbolIndex(): Map<string, string> {
  if (!symbolIndex) {
    symbolIndex = new Map()
    for (const key of Object.keys(lens.resolutions)) {
      symbolIndex.set(normalizeSymbol(key), key)
    }
  }
  return symbolIndex
}

export function getReportsLensStats(): ReportsLensStats {
  return lens.stats
}

/**
 * Lens entry for one mandate document, or null when the lens has neither a
 * detected reporting request nor a linked report for it. Symbol matching is
 * whitespace/case-insensitive.
 */
export function getReportsLensForSymbol(
  documentSymbol: string
): (ResolutionReportsLens & { symbol: string }) | null {
  const key = getSymbolIndex().get(normalizeSymbol(documentSymbol))
  if (!key) return null
  return { symbol: key, ...lens.resolutions[key] }
}

/** A row of the "deepest reporting pipelines" ranking on /reports. */
export interface ReportingPipeline {
  symbol: string
  title: string | null
  year: number | null
  body: string | null
  requestCount: number
  /** Distinct addressees named across this resolution's requests. */
  addressees: string[]
  /** Most specific frequency requested (order of FREQUENCY_ORDER). */
  frequency: ReportFrequency | null
  reportCount: number
  firstReportYear: number | null
  lastReportYear: number | null
}

let pipelinesCache: ReportingPipeline[] | null = null

/**
 * All resolutions with ≥1 linked report, ranked by number of linked reports.
 * Computed once per server process.
 */
export function getReportingPipelines(): ReportingPipeline[] {
  if (!pipelinesCache) {
    pipelinesCache = Object.entries(lens.resolutions)
      .filter(([, e]) => e.reports.length > 0)
      .map(([symbol, e]) => {
        const years = e.reports
          .map((r) => (r.date ? Number(r.date.slice(0, 4)) : null))
          .filter((y): y is number => y !== null)
        const frequency =
          FREQUENCY_ORDER.find((f) =>
            e.requests.some((r) => r.frequency === f)
          ) ?? null
        return {
          symbol,
          title: e.title,
          year: e.year,
          body: e.body,
          requestCount: e.requests.length,
          addressees: [
            ...new Set(
              e.requests
                .map((r) => r.addressee)
                .filter((a): a is string => a !== null)
            ),
          ],
          frequency,
          reportCount: e.reports.length,
          firstReportYear: years.length ? Math.min(...years) : null,
          lastReportYear: years.length ? Math.max(...years) : null,
        }
      })
      .sort(
        (a, b) => b.reportCount - a.reportCount || a.symbol.localeCompare(b.symbol)
      )
  }
  return pipelinesCache
}
