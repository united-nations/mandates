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
import { ActiveFilters } from '@/components/ActiveFilters'
import { DirectoryExplorer } from '@/components/DirectoryExplorer'
import { ExplainerText } from '@/components/ExplainerText'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ResourceLink } from '@/components/ResourceLink'
import {
  getBudgetVersions,
  getDefaultVersionSlug,
} from '@/lib/data/budget-documents'
import { getAllEntities } from '@/lib/data/entities'
import { getAllOrgans } from '@/lib/data/organs'
import { getExploreCardData, getMandatePageData } from '@/lib/data/mandates'
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

  // The four explore cards. Every number here honours the ACTIVE filters, so
  // filtering to one entity moves all four — with one deliberate exception per
  // card, its own dimension, dropped inside the query it comes from
  // (getOrganHierarchy drops `organ`, getBudgetHierarchy drops `entity` and the
  // budget levels, getSubjectHierarchy drops `subject`/`subject_domain`,
  // getDocumentTypeCatalogue drops `document_type`). Without that, picking an
  // organ would make the organs card read "1" and its list offer nothing else.
  // The scopes and the fetch itself live in the data layer (exploreCardScopes /
  // getExploreCardData) so the cards and the panels cannot drift apart.
  //
  // All four are read through ONE budget version (filters.ppb_version, else the
  // DB default) — the lens chosen in card 3's panel. It decides which citations
  // exist as far as this page is concerned, so it moves every number here and
  // every citation column in the table below.
  const [versions, entities, organs, cards] = await Promise.all([
    getBudgetVersions(),
    getAllEntities(),
    getAllOrgans(),
    getExploreCardData(filters),
  ])
  const activeVersionSlug =
    versions.find((v) => v.slug === filters.ppb_version)?.slug ??
    getDefaultVersionSlug(versions)
  const activeVersion = versions.find((v) => v.slug === activeVersionSlug)

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

      {/* Active filters, then the four explore cards. The bar sits ABOVE the
          cards because it is what the cards' numbers are computed against —
          reading downwards, you see the filters and then their effect. */}
      <section className="mx-auto max-w-6xl px-6 pt-6 md:px-12 lg:px-16">
        <ActiveFilters
          entitiesData={entities}
          allOrgans={organs}
          citedVersionLabel={
            activeVersion ? `PPB ${activeVersion.ppb_year}` : undefined
          }
          className="mb-4"
        />
        <DirectoryExplorer
          organGroups={cards.organGroups}
          budgetStreams={cards.budgetStreams}
          subjectDomains={cards.subjectDomains}
          documentTypes={cards.documentTypes}
          allDocumentsCount={cards.allDocumentsCount}
          citedDocumentCount={cards.citedDocumentCount}
          versions={versions}
          activeVersionSlug={activeVersionSlug}
        />
      </section>

      {/* Mandates explorer. It manages its own width internally: it sits at the
          normal page column by default and steps wider only as the reader adds
          columns. The #mandates anchor stays outside the Suspense boundary so
          directory selections can scroll to it immediately. */}
      <section id="mandates" className="scroll-mt-20 pt-8 pb-10">
        <Suspense
          fallback={
            /* Must match the table's DEFAULT width — TABLE_WIDTH_STEPS[0] in
               MandateExplorerClient, i.e. max-w-6xl. The skeleton used to sit
               at max-w-7xl, so the page visibly narrowed the moment the data
               arrived. */
            <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-16">
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
