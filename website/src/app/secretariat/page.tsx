import {
  FileText,
  GitCompare,
  Globe,
  Landmark,
  Library,
  Target,
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { MandateExplorerServer } from '@/app/_mandateExplorerServer'
import { DirectoryExplorer } from '@/components/DirectoryExplorer'
import { ExplainerText } from '@/components/ExplainerText'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ResourceLink } from '@/components/ResourceLink'
import {
  getBudgetHierarchy,
  getDocumentTypeCatalogue,
  getMandateCounts,
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

  // Light, cached fetches: the directory data for the explore modals, plus the
  // catalogue document count for the third box (mandate sources for the current
  // budget version, independent of any facet filter).
  //
  // EVERY one of these is scoped to the same population: the active budget
  // version, catalogue-wide (no facet filter). That is what makes the tiles and
  // the three modals describe ONE document set. Passing no version here — as the
  // hierarchies used to — silently pinned them to budget_versions.is_default, so
  // ?ppb_version=ppb2026 showed a correct 3,962-document total next to topic and
  // budget counts computed for ppb2027 (HUMAN RIGHTS 215 instead of 506).
  const catalogueScope = {
    mode: 'active_mandates' as const,
    ppb_version: filters.ppb_version,
  }
  const [organGroups, budgetStreams, subjectDomains, documentTypes, counts] =
    await Promise.all([
      getOrganHierarchy(filters.ppb_version),
      getBudgetHierarchy(catalogueScope),
      getSubjectHierarchy(catalogueScope),
      getDocumentTypeCatalogue(filters.ppb_version),
      getMandateCounts(catalogueScope),
    ])

  return (
    <div>
      {/* Intro */}
      <section className="mx-auto max-w-6xl px-6 pt-8 md:px-12 lg:px-16">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
          {explainerTexts.mainHeader.headline}
        </h1>
        <ExplainerText />
        {/* The analytics page still exists at /secretariat/analytics but is
            deliberately unlinked for now — it should not be discoverable. */}
        <p className="mt-4 text-sm font-medium text-un-blue">
          <Link href="/methodology" className="hover:underline">
            See the methodology
          </Link>
        </p>
      </section>

      {/* Explore boxes (organs / entities / documents) → modals. */}
      <section className="mx-auto max-w-6xl px-6 pt-6 md:px-12 lg:px-16">
        <DirectoryExplorer
          organGroups={organGroups}
          budgetStreams={budgetStreams}
          subjectDomains={subjectDomains}
          documentTypes={documentTypes}
          documentCount={counts.totalDocuments}
        />
      </section>

      {/* Mandates explorer. It manages its own widths internally: the table and
          its controls break out to the wide column. The #mandates anchor stays
          outside the Suspense boundary so directory selections can scroll to it
          immediately. */}
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
