import Link from 'next/link'
import { Suspense } from 'react'

import { MandateExplorerServer } from '@/app/_mandateExplorerServer'
import { ExpandableCard } from '@/components/ExpandableCard'
import { GenealogyHeadline } from '@/components/genealogy/GenealogyHeadline'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ReportsLensYearChart } from '@/components/ReportsLensYearChart'
import { ResolutionCitationTrend } from '@/components/ResolutionCitationTrend'
import { ResolutionLengthTrend } from '@/components/ResolutionLengthTrend'
import { ResolutionRecurrenceTrend } from '@/components/ResolutionRecurrenceTrend'
import { SectionBanner } from '@/components/SectionBanner'
import {
  ChartHeading,
  ChartNote,
  SECTION_CONTENT,
  SectionExpanders,
} from '@/components/sections/SecretariatSection'
import {
  getResolutionCitationTrend,
  getResolutionRecurrenceTrend,
} from '@/lib/data/mandates'
import { getResolutionLength } from '@/lib/data/resolution-length'
import { getReportsLensStats } from '@/lib/data/reports-lens'
import { genealogyMeta, headlineByAge, headlineByDecade } from '@/lib/genealogy'
import type { ApiResponse } from '@/types'

const nf = new Intl.NumberFormat('en-US')

interface MandatesSectionProps {
  dataPromise: Promise<ApiResponse>
  ppbVersion?: string
}

/**
 * Section 01 — the registry itself, and the three lenses that ask what happens
 * to a mandate text over time: does the corpus grow, is the text recycled, and
 * does the paper it asks for come back?
 *
 * This section does not use SecretariatSection, because the explorer manages
 * its own width: the table steps wider as the reader adds columns, so it must
 * sit outside the fixed content column that the expanders use.
 */
export async function MandatesSection({
  dataPromise,
  ppbVersion,
}: MandatesSectionProps) {
  // The length trend reads digitallibrary.document_paragraphs, the same table
  // the language-of-command lens uses. Degrade to an empty series rather than
  // taking the whole section down if that read fails.
  const [resolutionTrend, recurrenceTrend, lengthTrend] = await Promise.all([
    getResolutionCitationTrend(ppbVersion),
    getResolutionRecurrenceTrend(),
    getResolutionLength().catch(() => []),
  ])
  const reports = getReportsLensStats()

  const firstRenewal = headlineByAge.find((h) => h.age === 1)
  const thirdRenewal = headlineByAge.find((h) => h.age === 3)
  const tenthRenewal = headlineByAge.find((h) => h.age === 10)
  const carriedByThird = thirdRenewal
    ? Math.round(thirdRenewal.verbatimPct + thirdRenewal.mutatedPct)
    : null

  return (
    <>
      <SectionBanner
        id="mandates"
        imageSrc="/images/banners/hero-banner-system-revenue.png"
        title="Which mandates is the UN working on?"
        description="The resolutions, decisions, and other documents that UN entities cite in support of their resource requirements. Search and filter the full registry, or narrow it by entity, organ, or topic using the sections below."
      />

      <section className="pt-12">
        <Suspense
          fallback={
            /* Must match the table's DEFAULT width — TABLE_WIDTH_STEPS[0] in
               MandateExplorerClient, i.e. max-w-6xl. A wider skeleton makes the
               page visibly narrow the moment the data arrives. */
            <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-16">
              <LoadingSkeleton variant="list" count={4} />
            </div>
          }
        >
          <MandateExplorerServer dataPromise={dataPromise} />
        </Suspense>
      </section>

      <div className={SECTION_CONTENT}>
        <SectionExpanders>
          <ExpandableCard id="trends" title="Trends over time" variant="filled">
            <div className="space-y-10">
              <div>
                <ChartHeading>Resolutions and cited mandates</ChartHeading>
                <ResolutionCitationTrend data={resolutionTrend} />
              </div>
              <div>
                <ChartHeading>Genuinely new resolutions</ChartHeading>
                <ResolutionRecurrenceTrend data={recurrenceTrend} />
              </div>
              {lengthTrend.length > 0 && (
                <div>
                  <ChartHeading>How long is a resolution?</ChartHeading>
                  <ResolutionLengthTrend data={lengthTrend} />
                  <ChartNote>
                    Measured on the parsed English corpus in the UN Digital
                    Library, not on every resolution ever adopted. Coverage is
                    better in recent decades, so a change in the early years can
                    be a change in what was parsed rather than in what was
                    written. Years with fewer than ten parsed documents are left
                    out entirely.
                  </ChartNote>
                </div>
              )}
            </div>
          </ExpandableCard>

          <ExpandableCard
            id="genealogy"
            title="Boilerplate genealogy: how much of a resolution is new?"
            variant="filled"
          >
            <div className="space-y-6">
              <p className="max-w-3xl text-sm leading-relaxed text-gray-700">
                Most resolutions are re-adoptions, not fresh drafts. Aligning{' '}
                {nf.format(genealogyMeta.nParas)} paragraphs across{' '}
                {nf.format(genealogyMeta.nChainsAnalyzed)} renewal chains shows
                the first re-adoption already keeps{' '}
                {firstRenewal && (
                  <strong className="font-semibold text-gray-900">
                    {firstRenewal.verbatimPct}%
                  </strong>
                )}{' '}
                of its text word for word. By the third renewal{' '}
                {carriedByThird && (
                  <strong className="font-semibold text-gray-900">
                    {carriedByThird}%
                  </strong>
                )}{' '}
                is carried over, and by the tenth{' '}
                {tenthRenewal && (
                  <strong className="font-semibold text-gray-900">
                    {tenthRenewal.verbatimPct}%
                  </strong>
                )}{' '}
                is identical.
              </p>
              <GenealogyHeadline
                byAge={headlineByAge}
                byDecade={headlineByDecade}
              />
              <LensLink href="/genealogy">
                Follow a single chain paragraph by paragraph
              </LensLink>
            </div>
          </ExpandableCard>

          <ExpandableCard
            id="reporting"
            title="The reporting cycle: does the paper come back?"
            variant="filled"
          >
            <div className="space-y-6">
              <p className="max-w-3xl text-sm leading-relaxed text-gray-700">
                A large share of mandates simply ask an official to report back.
                The registry detects {nf.format(reports.requestParagraphs)}{' '}
                reporting obligations across{' '}
                {nf.format(reports.resolutionsWithRequests)} resolutions, and
                links {nf.format(reports.deliveredReports)} delivered reports
                that name the resolution they answer —{' '}
                {Math.round(reports.requestMatchRate * 100)}% of requesting
                resolutions have at least one linked report.
              </p>
              <ReportsLensYearChart
                reportsPerYear={reports.reportsPerYear}
                description="Reports published each year that state which registry resolution they respond to."
              />
              <LensLink href="/reports">
                Open the reporting cycle in full
              </LensLink>
            </div>
          </ExpandableCard>
        </SectionExpanders>
      </div>
    </>
  )
}

/** Link out of an expander to the lens's own page. */
export function LensLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-un-blue hover:underline"
    >
      {children} <span aria-hidden>→</span>
    </Link>
  )
}
