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
import { DirectoryExplorer } from '@/components/DirectoryExplorer'
import { ExpandableCard } from '@/components/ExpandableCard'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { QuoteBlock } from '@/components/QuoteBlock'
import { ResourceLink } from '@/components/ResourceLink'
import {
  getBudgetHierarchy,
  getMandatePageData,
  getOrganHierarchy,
  getSubjectHierarchy,
} from '@/lib/data/mandates'
import { explainerTexts } from '@/lib/en_text_contents'
import { parseSearchParams } from '@/lib/filter-constants'

export const metadata: Metadata = {
  title: 'UN Secretariat Mandates',
  description: explainerTexts.mainHeader.shortDescriptionPlain,
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams
  const filters = parseSearchParams(params)

  // Heavy explorer fetch — do NOT await; the Suspense boundary below streams a
  // skeleton and swaps in the data when it resolves.
  const dataPromise = getMandatePageData(filters)

  // Light directory fetches — awaited together and passed to the explore
  // buttons/modals. All are cached, so this is cheap on every request.
  const [organGroups, budgetStreams, subjectDomains] = await Promise.all([
    getOrganHierarchy(),
    getBudgetHierarchy(),
    getSubjectHierarchy(),
  ])

  return (
    <div>
      {/* The three explore buttons (organs / entities / topics) double as the
          summary stat cards and open the directory modals; a quieter link
          leads to the analytics page. */}
      <section className="mx-auto max-w-6xl px-6 pt-8 md:px-12 lg:px-16">
        <DirectoryExplorer
          organGroups={organGroups}
          budgetStreams={budgetStreams}
          subjectDomains={subjectDomains}
        />
      </section>

      {/* Mandates explorer. The explorer manages its own widths internally: the
          table and its controls break out to the wide column. The #mandates
          anchor stays outside the Suspense boundary so directory selections can
          scroll to it immediately. */}
      <section id="mandates" className="scroll-mt-20 pt-8 pb-10">
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-16">
              <LoadingSkeleton variant="list" count={4} />
            </div>
          }
        >
          <MandateExplorerServer dataPromise={dataPromise} />
        </Suspense>
      </section>

      {/* Methodology */}
      <section className="bg-white py-10 md:py-12">
        <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-16">
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
                  Some citations in the 2027 proposed programme budget are
                  preliminary, drawn from advance versions of the underlying
                  documents, and may change in the final budget: Section&nbsp;1
                  (Overall policymaking, direction and coordination), from
                  A/81/6&nbsp;(Sect.&nbsp;1); and the special political
                  missions, from A/81/6&nbsp;(Sect.&nbsp;3)/Add.1–4.
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
        lines={[
          'Mandates are critical to everything we do.',
          'They define our work.',
          'They shape our structures.',
          'They are the basis for how we are held accountable.',
        ]}
        attribution="António Guterres, UN Secretary-General"
      />

      {/* Further resources */}
      <section id="resources" className="scroll-mt-20 bg-white py-10 md:py-12">
        <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-16">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
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
