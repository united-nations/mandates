import {
  FileText,
  GitCompare,
  Globe,
  Landmark,
  Library,
  Target,
} from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { Suspense } from 'react'

import { HeaderStatsServer } from '@/app/_headerStatsServer'
import { MandateExplorerServer } from '@/app/_mandateExplorerServer'
import { EntitiesDirectory } from '@/components/EntitiesDirectory'
import { ExpandableCard } from '@/components/ExpandableCard'
import { ExplainerText } from '@/components/ExplainerText'
import { HeaderStatsSkeleton } from '@/components/HeaderStats.skeleton'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { OrgansDirectory } from '@/components/OrgansDirectory'
import { QuoteBlock } from '@/components/QuoteBlock'
import { ResourceLink } from '@/components/ResourceLink'
import { SectionBanner } from '@/components/SectionBanner'
import { SubjectsCompact } from '@/components/SubjectsCompact'
import {
  getBudgetHierarchy,
  getMandatePageData,
  getOrganHierarchy,
  getSubjectHierarchy,
  getTopicTrends,
} from '@/lib/data/mandates'
import { TopicTrends } from '@/components/TopicTrends'
import { explainerTexts } from '@/lib/en_text_contents'
import { parseSearchParams } from '@/lib/filter-constants'

export const metadata: Metadata = {
  title: 'UN Secretariat Mandates',
  description: explainerTexts.mainHeader.shortDescriptionPlain,
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Placeholder shown inside the per-section "trends" expanders until the real
// visualisations are built.
function ComingSoon({ items }: { items?: string[] }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/60 p-6 text-sm text-gray-500">
      <p>Trends will be added here.</p>
      {items && items.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const CONTENT = 'mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16'

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams
  const filters = parseSearchParams(params)

  // Heavy explorer fetch — do NOT await; the Suspense boundary in section 3
  // streams a skeleton and swaps in the data when it resolves.
  const dataPromise = getMandatePageData(filters)

  // Light directory fetches — awaited together; these sections render above the
  // streamed explorer. All three are cached, so this is cheap on every request.
  const [organGroups, budgetStreams, subjectDomains, topicTrends] =
    await Promise.all([
      getOrganHierarchy(),
      getBudgetHierarchy(),
      getSubjectHierarchy(),
      getTopicTrends(),
    ])

  return (
    <div>
      {/* Intro */}
      <section className="mx-auto max-w-6xl px-6 pt-10 pb-12 md:px-12 lg:px-16">
        <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground">
          {explainerTexts.mainHeader.headline}
        </h1>
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <ExplainerText />
          <div className="w-full shrink-0 sm:w-64">
            <Suspense fallback={<HeaderStatsSkeleton />}>
              <HeaderStatsServer dataPromise={dataPromise} />
            </Suspense>
          </div>
        </div>
      </section>

      {/* 1 — Organs */}
      <SectionBanner
        id="organs"
        imageSrc="/images/banners/hero-banner-homepage.png"
        title="Which organs are creating mandates?"
        description="The intergovernmental organs and bodies that adopt Secretariat mandates. Select one to filter the mandates below."
      />
      <section className={CONTENT}>
        <OrgansDirectory groups={organGroups} />
        <div className="mt-10">
          <ExpandableCard title="Organs × entities matrix" variant="filled">
            <ComingSoon />
          </ExpandableCard>
        </div>
      </section>

      {/* 2 — Entities */}
      <SectionBanner
        id="entities"
        imageSrc="/images/banners/hero-banner-secretariat-expenses.png"
        title="Which entities are implementing mandates?"
        description="Every budget-holding entity, grouped by the United Nations programme budget structure. Select one to filter the mandates below."
      />
      <section className={CONTENT}>
        <EntitiesDirectory streams={budgetStreams} />
        <div className="mt-10">
          <ExpandableCard title="Overlap between entities" variant="filled">
            <ComingSoon />
          </ExpandableCard>
        </div>
      </section>

      {/* 3 — Mandates (the streamed explorer) */}
      <SectionBanner
        id="mandates"
        imageSrc="/images/banners/hero-banner-system-revenue.png"
        title="Which mandates do they implement?"
        description="The resolutions, decisions, and other documents that UN entities cite in support of their resource requirements. Search and filter the full registry."
      />
      {/* The explorer manages its own widths internally: the stat cards sit in
          the narrow column, the table and its controls break out to the wide
          column. Only the trends expander is constrained here. */}
      <section className="py-12">
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-16">
              <LoadingSkeleton variant="list" count={4} />
            </div>
          }
        >
          <MandateExplorerServer dataPromise={dataPromise} />
        </Suspense>
        <div className="mx-auto mt-10 max-w-6xl px-6 md:px-12 lg:px-16">
          <ExpandableCard title="Trends over time" variant="filled">
            <ComingSoon
              items={[
                'Number of resolutions and cited mandates',
                'Length of resolutions',
                'Recurrence',
              ]}
            />
          </ExpandableCard>
        </div>
      </section>

      {/* 4 — Subjects */}
      <SectionBanner
        id="subjects"
        imageSrc="/images/banners/hero-banner-system-expenses.png"
        title="Which topics are the mandates about?"
        description="Every subject applied to a mandate document, grouped into broad thematic domains. Select a topic to filter the mandates above."
      />
      <section className={CONTENT}>
        <SubjectsCompact domains={subjectDomains} />
        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-gray-500">
          Subjects are organised by the United Nations Bibliographic Information
          System (UNBIS) thesaurus: 18 top-level domains, each broken into
          sub-domains and individual subject headings.
        </p>
        <div className="mt-10">
          <ExpandableCard title="Topic trends" variant="filled">
            <TopicTrends years={topicTrends} />
          </ExpandableCard>
        </div>
      </section>

      {/* Methodology */}
      <section className="bg-white py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-16">
          <h2 className="mb-8 text-2xl font-bold text-gray-900">Background</h2>
          <div className="divide-y divide-gray-200">
            <ExpandableCard id="methodology" title="Methodology and Scope">
              <div className="space-y-4">
                {explainerTexts.mainHeader.fullDescription.map(
                  (paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  )
                )}
                <Image
                  src="/images/methodology.svg"
                  alt="How mandate source documents are identified"
                  width={248}
                  height={135}
                  unoptimized
                  className="h-auto w-3/4"
                />
                <p>
                  Section&nbsp;1 (Overall policymaking, direction and
                  coordination) citations in the 2027 proposed programme budget
                  are preliminary, drawn from the advance version of
                  A/81/6&nbsp;(Sect.&nbsp;1), and may change in the final
                  budget.
                </p>
                <p className="text-gray-500 italic">
                  {explainerTexts.mainHeader.disclaimer}
                </p>
              </div>
            </ExpandableCard>
          </div>
        </div>
      </section>

      {/* Quote */}
      <QuoteBlock
        quote="Mandates are critical to everything we do. They define our work. They shape our structures. They are the basis for how we are held accountable."
        attribution="António Guterres, UN Secretary-General"
        imageSrc="/images/banners/guterres.png"
        imageAlt="UN Secretary-General António Guterres"
      />

      {/* Further resources */}
      <section id="resources" className="scroll-mt-20 bg-white py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-16">
          <h2 className="mb-8 text-2xl font-bold text-gray-900">
            Further resources
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ResourceLink
              title="UN Transparency Portal"
              description="Visual exploration of the budget of the UN Secretariat and the wider UN System."
              href="https://open.un.org/"
              icon={Globe}
            />
            <ResourceLink
              title="Programme Budget Results"
              description="Results information for the proposed programme budget."
              href="https://results.un.org/"
              icon={Target}
            />
            <ResourceLink
              title="UN Meeting Transcripts"
              description="Searchable transcripts of UN meetings and proceedings."
              href="https://transcripts.un.org/"
              icon={FileText}
            />
            <ResourceLink
              title="UN Document Diff Viewer"
              description="Compare versions of UN documents side by side and track the changes."
              href="https://diff.un-two-zero.dev/"
              icon={GitCompare}
            />
            <ResourceLink
              title="UN Digital Library"
              description="Official repository of UN documents, resolutions, and voting records."
              href="https://digitallibrary.un.org/"
              icon={Library}
            />
            <ResourceLink
              title="UN80 Initiative"
              description="The Secretary-General's initiative to strengthen the UN across mandates, efficiencies, and structure."
              href="https://www.un.org/un80-initiative/en"
              icon={Landmark}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
