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

import { MandateExplorerServer } from '@/app/_mandateExplorerServer'
import { CoCitationHeatmap } from '@/components/CoCitationHeatmap'
import { EntitiesDirectory } from '@/components/EntitiesDirectory'
import { ExpandableCard } from '@/components/ExpandableCard'
import { ExplainerText } from '@/components/ExplainerText'
import { LanguageStrengthGradient } from '@/components/LanguageStrengthGradient'
import { LanguageStrengthTrend } from '@/components/LanguageStrengthTrend'
import {
  LanguageStrengthDemands,
  LanguageStrengthVerbs,
} from '@/components/LanguageStrengthVerbs'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { OrganEntityHeatmap } from '@/components/OrganEntityHeatmap'
import { OrgansDirectory } from '@/components/OrgansDirectory'
import { QuoteBlock } from '@/components/QuoteBlock'
import { ResolutionCitationTrend } from '@/components/ResolutionCitationTrend'
import { ResolutionRecurrenceTrend } from '@/components/ResolutionRecurrenceTrend'
import { ResourceLink } from '@/components/ResourceLink'
import { SectionBanner } from '@/components/SectionBanner'
import { SubjectsCompact } from '@/components/SubjectsCompact'
import {
  getBudgetHierarchy,
  getEntityCoCitationMatrix,
  getMandatePageData,
  getOrganEntityMatrix,
  getOrganHierarchy,
  getResolutionCitationTrend,
  getResolutionRecurrenceTrend,
  getSubjectHierarchy,
  getTopicTrends,
} from '@/lib/data/mandates'
import { getLanguageStrength } from '@/lib/data/language-strength'
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

const CONTENT = 'mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16'

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams
  const filters = parseSearchParams(params)

  // Heavy explorer fetch — do NOT await; the Suspense boundary in section 1
  // streams a skeleton and swaps in the data when it resolves.
  const dataPromise = getMandatePageData(filters)

  // Light directory fetches — awaited together; these sections render below the
  // streamed explorer. All are cached, so this is cheap on every request.
  const [
    organGroups,
    budgetStreams,
    subjectDomains,
    topicTrends,
    coCitationMatrix,
    organEntityMatrix,
    resolutionTrend,
    recurrenceTrend,
    languageStrength,
  ] = await Promise.all([
    getOrganHierarchy(),
    getBudgetHierarchy(),
    getSubjectHierarchy(),
    getTopicTrends(),
    getEntityCoCitationMatrix(filters.ppb_version),
    getOrganEntityMatrix(filters.ppb_version),
    getResolutionCitationTrend(filters.ppb_version),
    getResolutionRecurrenceTrend(),
    getLanguageStrength(),
  ])

  return (
    <div>
      {/* Intro */}
      <section className="mx-auto max-w-6xl px-6 pt-10 pb-12 md:px-12 lg:px-16">
        <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground">
          {explainerTexts.mainHeader.headline}
        </h1>
        <ExplainerText />
      </section>

      {/* 1 — Mandates (the streamed explorer) */}
      <SectionBanner
        id="mandates"
        imageSrc="/images/banners/hero-banner-system-revenue.png"
        title="Which mandates is the UN working on?"
        description="The resolutions, decisions, and other documents that UN entities cite in support of their resource requirements. Search and filter the full registry, or narrow it by entity, organ, or topic using the sections below."
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
            <div className="space-y-10">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  Resolutions and cited mandates
                </h3>
                <ResolutionCitationTrend data={resolutionTrend} />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  Genuinely new resolutions
                </h3>
                <ResolutionRecurrenceTrend data={recurrenceTrend} />
              </div>
            </div>
          </ExpandableCard>
        </div>
      </section>

      {/* 2 — Entities */}
      <SectionBanner
        id="entities"
        imageSrc="/images/banners/hero-banner-secretariat-expenses.png"
        title="Which entities are implementing the mandates?"
        description="Every budget-holding entity, grouped by the United Nations programme budget structure. Select one to filter the mandates above."
      />
      <section className={CONTENT}>
        <EntitiesDirectory streams={budgetStreams} />
        <div className="mt-10">
          <ExpandableCard
            title="Co-citations between entities"
            variant="filled"
          >
            <CoCitationHeatmap matrix={coCitationMatrix} />
          </ExpandableCard>
        </div>
      </section>

      {/* 3 — Organs */}
      <SectionBanner
        id="organs"
        imageSrc="/images/banners/hero-banner-homepage.png"
        title="Which organs are creating the mandates?"
        description="The intergovernmental organs and bodies that adopt Secretariat mandates. Select one to filter the mandates above."
      />
      <section className={CONTENT}>
        <OrgansDirectory groups={organGroups} />
        <div className="mt-10">
          <ExpandableCard
            title="Citation patterns between entities and organs"
            variant="filled"
          >
            <OrganEntityHeatmap matrix={organEntityMatrix} />
          </ExpandableCard>
        </div>
        <div className="mt-6">
          <ExpandableCard
            id="language-of-command"
            title="The language of command"
            variant="filled"
          >
            <div className="space-y-10">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  The Assembly asks more and orders less; the Council went the
                  other way
                </h3>
                <LanguageStrengthTrend data={languageStrength.decades} />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  The command gradient: the Secretary-General gets told, Member
                  States get asked
                </h3>
                <LanguageStrengthGradient data={languageStrength.gradient} />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  The verbs of the United Nations
                </h3>
                <LanguageStrengthVerbs verbs={languageStrength.verbs} />
              </div>
              <LanguageStrengthDemands data={languageStrength.scDemands} />
              <p className="max-w-3xl text-xs leading-relaxed text-gray-500">
                Source: parsed English texts of ~21,900 General Assembly,
                Security Council and Economic and Social Council resolutions and
                decisions in the UN Digital Library. Each operative paragraph is
                classified by the verb it opens with. &ldquo;Directive&rdquo;
                and &ldquo;requesting&rdquo; describe the strength of the
                wording only — they say nothing about legal force. Paragraphs
                opening with stocktaking verbs (<em>recalls</em>,{' '}
                <em>welcomes</em>, <em>notes</em>) are excluded.
              </p>
            </div>
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
              description="Building a simpler, more effective and more coherent UN System."
              href="https://www.un.org/un80-initiative/en"
              icon={Landmark}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
