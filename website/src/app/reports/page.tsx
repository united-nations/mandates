import type { Metadata } from 'next'
import Link from 'next/link'

import { ExpandableCard } from '@/components/ExpandableCard'
import { ReportsLensBarList } from '@/components/ReportsLensBarList'
import { ReportsLensImplementationSamples } from '@/components/ReportsLensImplementationSamples'
import { ReportsLensYearChart } from '@/components/ReportsLensYearChart'
import { getMandateUrl } from '@/components/table/MandateColumns'
import {
  getImplementationSamples,
  getImplementationStatusCounts,
  IMPLEMENTATION_STATUS_LABELS,
  IMPLEMENTATION_STATUS_ORDER,
} from '@/lib/data/report-implementation'
import {
  FREQUENCY_LABELS,
  FREQUENCY_ORDER,
  getReportingPipelines,
  getReportsLensStats,
} from '@/lib/data/reports-lens'

export const metadata: Metadata = {
  title: 'Mandated Reports',
  description:
    'The UN reporting cycle: which resolutions ask for reports, who is asked to write them, and which reports were submitted pursuant to which mandate.',
}

// Short organ codes used by the mandate registry, spelled out for display.
const BODY_LABELS: Record<string, string> = {
  GA: 'General Assembly',
  SC: 'Security Council',
  ECOSOC: 'Economic and Social Council',
  HRC: 'Human Rights Council',
  CND: 'Commission on Narcotic Drugs',
  ECE: 'Economic Commission for Europe',
  UNEA: 'UN Environment Assembly',
  'UNHA and Other': 'UN-Habitat Assembly and other',
}

const bodyLabel = (code: string | null) =>
  code ? (BODY_LABELS[code] ?? code) : 'Other'

const PIPELINES_SHOWN = 15

function StatTile({ value, label }: { value: string; label: React.ReactNode }) {
  return (
    <div className="border-l-2 border-un-blue/60 pl-4">
      <p className="text-3xl font-bold tracking-tight text-gray-900 tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-sm leading-snug text-gray-500">{label}</p>
    </div>
  )
}

export default function ReportsPage() {
  const stats = getReportsLensStats()
  const pipelines = getReportingPipelines()
  const implementationSamples = getImplementationSamples()
  const implementationCounts = getImplementationStatusCounts()
  const implementationMappingCount = implementationSamples.reduce(
    (a, s) => a + s.mappings.length,
    0
  )
  const topPipelines = pipelines.slice(0, PIPELINES_SHOWN)

  const frequencyRows = FREQUENCY_ORDER.filter(
    (f) => (stats.frequencies[f] ?? 0) > 0
  ).map((f) => ({
    label: FREQUENCY_LABELS[f],
    count: stats.frequencies[f] ?? 0,
  }))

  const TOP_ADDRESSEES = 8
  const addressees = Object.entries(stats.addressees).sort(
    (a, b) => b[1] - a[1]
  )
  const addresseeRows = addressees
    .slice(0, TOP_ADDRESSEES)
    .map(([label, count]) => ({ label, count }))
  const otherAddressees = addressees
    .slice(TOP_ADDRESSEES)
    .reduce((sum, [, count]) => sum + count, 0)
  if (otherAddressees > 0)
    addresseeRows.push({
      label: `Other (${addressees.length - TOP_ADDRESSEES} roles)`,
      count: otherAddressees,
    })

  const bodyRows = Object.entries(stats.byBody).sort(
    (a, b) => b[1].reports - a[1].reports || b[1].requests - a[1].requests
  )

  const pct = (x: number) => `${Math.round(x * 100)}%`
  const pct1 = (x: number) => `${(Math.round(x * 1000) / 10).toLocaleString()}%`

  return (
    <div className="pb-8">
      {/* Intro */}
      <section>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          The reporting cycle
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-600">
          Many mandates are requests for paper: a resolution asks the
          Secretary-General or another official to report back, and months later
          a report arrives that names the resolution it responds to. This page
          links the two sides — reporting requests detected in the text of the
          resolutions in the{' '}
          <Link href="/secretariat" className="text-un-blue hover:underline">
            mandate registry
          </Link>
          , and the reports submitted pursuant to them in the UN Digital
          Library.
        </p>
      </section>

      {/* Headline stats */}
      <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          value={stats.requestParagraphs.toLocaleString()}
          label={
            <>
              reporting obligations detected in{' '}
              {stats.resolutionsWithRequests.toLocaleString()} resolutions
            </>
          }
        />
        <StatTile
          value={stats.deliveredReports.toLocaleString()}
          label="reports declare which resolution requested them"
        />
        <StatTile
          value={pct1(stats.linkEdgeRegistryRate)}
          label="of those report-to-resolution links point into the mandate registry"
        />
        <StatTile
          value={pct(stats.requestMatchRate)}
          label="of resolutions that ask for a report have at least one linked report"
        />
      </section>

      {/* Timeline */}
      <section className="mt-14">
        <h2 className="mb-3 text-2xl font-bold text-gray-900">
          Reports delivered over time
        </h2>
        <ReportsLensYearChart
          reportsPerYear={stats.reportsPerYear}
          description="Reports published each year that state which registry resolution they respond to. The rise reflects both a growing reporting workload and better machine-readable records in recent decades."
        />
      </section>

      {/* What is asked, and of whom */}
      <section className="mt-14 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-2xl font-bold text-gray-900">
            How often reports are due
          </h2>
          <p className="mb-4 max-w-md text-sm text-gray-500">
            The frequency stated in each of the{' '}
            {stats.requestParagraphs.toLocaleString()} requesting paragraphs.
            Most requests are tied to a session or leave the rhythm open.
          </p>
          <ReportsLensBarList rows={frequencyRows} />
        </div>
        <div>
          <h2 className="mb-3 text-2xl font-bold text-gray-900">
            Who is asked to report
          </h2>
          <p className="mb-4 max-w-md text-sm text-gray-500">
            The addressee named in each requesting paragraph. The
            Secretary-General carries most of the reporting load.
          </p>
          <ReportsLensBarList rows={addresseeRows} />
        </div>
      </section>

      {/* By organ */}
      <section className="mt-14">
        <h2 className="mb-3 text-2xl font-bold text-gray-900">
          Requests and reports by organ
        </h2>
        <p className="mb-4 max-w-3xl text-sm text-gray-500">
          Security Council resolutions ask for few but frequent reports (monthly
          or quarterly briefing cycles), so a handful of resolutions accumulates
          hundreds of reports. Assembly and Council resolutions mostly ask for
          one report per session or year.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
                <th className="py-2 pr-4 font-medium">Organ</th>
                <th className="py-2 pr-4 text-right font-medium">
                  Resolutions with requests
                </th>
                <th className="py-2 pr-4 text-right font-medium">
                  Reporting obligations
                </th>
                <th className="py-2 text-right font-medium">Linked reports</th>
              </tr>
            </thead>
            <tbody>
              {bodyRows.map(([code, row]) => (
                <tr key={code} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-700">{bodyLabel(code)}</td>
                  <td className="py-2 pr-4 text-right text-gray-600 tabular-nums">
                    {row.resolutionsWithRequests.toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-right text-gray-600 tabular-nums">
                    {row.requests.toLocaleString()}
                  </td>
                  <td className="py-2 text-right font-medium text-gray-900 tabular-nums">
                    {row.reports.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Deepest pipelines */}
      <section className="mt-14">
        <h2 className="mb-3 text-2xl font-bold text-gray-900">
          The deepest reporting pipelines
        </h2>
        <p className="mb-4 max-w-3xl text-sm text-gray-500">
          The registry resolutions with the most reports submitted pursuant to
          them. Open a resolution to see its requests and every linked report.
          The two Human Rights Council framework resolutions at the top are
          cited pro forma by nearly every special-procedure and universal
          periodic review report; a dash under “asks for” means the resolution’s
          own text is not yet parsed for requests.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
                <th className="py-2 pr-4 font-medium">Resolution</th>
                <th className="py-2 pr-4 font-medium">Title</th>
                <th className="py-2 pr-4 font-medium">Organ</th>
                <th className="py-2 pr-4 font-medium">Asks for</th>
                <th className="py-2 pr-4 text-right font-medium">Reports</th>
                <th className="py-2 font-medium">Span</th>
              </tr>
            </thead>
            <tbody>
              {topPipelines.map((p) => (
                <tr key={p.symbol} className="border-b border-gray-100">
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <Link
                      href={getMandateUrl(p.symbol)}
                      className="font-mono text-xs font-medium text-un-blue hover:underline"
                    >
                      {p.symbol}
                    </Link>
                  </td>
                  <td
                    className="max-w-72 truncate py-2 pr-4 text-xs text-gray-600"
                    title={p.title ?? undefined}
                  >
                    {p.title}
                  </td>
                  <td className="py-2 pr-4 text-xs whitespace-nowrap text-gray-600">
                    {bodyLabel(p.body)}
                  </td>
                  <td className="py-2 pr-4 text-xs text-gray-600">
                    {p.frequency
                      ? `${FREQUENCY_LABELS[p.frequency]}${
                          p.addressees.length
                            ? ` · ${p.addressees.join(', ')}`
                            : ''
                        }`
                      : '—'}
                  </td>
                  <td className="py-2 pr-4 text-right font-medium text-gray-900 tabular-nums">
                    {p.reportCount.toLocaleString()}
                  </td>
                  <td className="py-2 text-xs whitespace-nowrap text-gray-500 tabular-nums">
                    {p.firstReportYear && p.lastReportYear
                      ? p.firstReportYear === p.lastReportYear
                        ? p.firstReportYear
                        : `${p.firstReportYear}–${p.lastReportYear}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Showing the top {topPipelines.length} of{' '}
          {pipelines.length.toLocaleString()} resolutions with at least one
          linked report.
        </p>
      </section>

      {/* Request → response implementation samples */}
      <section className="mt-14" id="implementation-samples">
        <h2 className="mb-3 text-2xl font-bold text-gray-900">
          Inside the reports: from request to response
        </h2>
        <p className="mb-2 max-w-3xl text-sm text-gray-500">
          Linking a report to its resolution says nothing about what the report
          actually delivers. For nine representative pairs across four organs,
          each requesting paragraph was broken down into its individual
          deliverables and mapped by hand against the full report text — what
          the report says about each request, with verbatim quotes as evidence.
        </p>
        <p className="mb-4 max-w-3xl text-xs font-medium text-amber-700">
          These are curated samples ({implementationSamples.length} pairs,{' '}
          {implementationMappingCount} individual requests), not full coverage
          of the {stats.requestParagraphs.toLocaleString()} detected requests.
        </p>
        <p className="mb-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          {IMPLEMENTATION_STATUS_ORDER.map((s) => (
            <span key={s}>
              <span className="font-semibold text-gray-800 tabular-nums">
                {implementationCounts[s]}
              </span>{' '}
              {IMPLEMENTATION_STATUS_LABELS[s].toLowerCase()}
            </span>
          ))}
        </p>
        <ReportsLensImplementationSamples samples={implementationSamples} />
      </section>

      {/* Methodology */}
      <section className="mt-14">
        <ExpandableCard title="How these links are made" variant="filled">
          <div className="max-w-3xl space-y-4">
            <p>
              <strong>Requests</strong> are detected in the operative paragraphs
              of the {stats.parsedResolutionDocs.toLocaleString()} registry
              resolutions with parsed full text: a paragraph counts when a
              requesting verb (“Requests”, “Invites”, …) is followed by a
              recognized addressee and a reporting obligation (“to submit a
              report”, “to keep the Council informed”, …). The frequency is
              classified from the same sentence.
            </p>
            <p>
              <strong>Reports</strong> link themselves: UN report records in the
              UN Digital Library carry a note such as “Submitted pursuant to
              General Assembly resolution 77/205”. These statements are parsed
              into resolution symbols; {pct1(stats.linkEdgeRegistryRate)} of the{' '}
              {stats.deliveredLinkEdges.toLocaleString()} parsed links resolve
              to a resolution in the mandate registry.
            </p>
            <p>
              Both directions undercount. Resolutions outside the registry, or
              without parsed text, contribute no requests; reports without a
              machine-readable pursuant note (common before the mid-1990s)
              contribute no links — the timeline above therefore understates the
              early decades. In a manual audit of 40 random samples per side,
              every sampled request and link was correct (addressee or frequency
              was misattributed in 3 of 40 requests); method details and the
              full audit are in the project repository
              (docs/lens-reports/ANALYSIS.md).
            </p>
          </div>
        </ExpandableCard>
      </section>
    </div>
  )
}
