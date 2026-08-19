import Link from 'next/link'
import { Suspense } from 'react'

import { MandateExplorerServer } from '@/app/_mandateExplorerServer'
import { ActiveFilters } from '@/components/ActiveFilters'
import { DirectoryExplorer } from '@/components/DirectoryExplorer'
import { ExplainerText } from '@/components/ExplainerText'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { explainerTexts } from '@/lib/en_text_contents'

import { FurtherResources } from './FurtherResources'
import type { loadSecretariatPageData } from './page-data'

type PageData = Awaited<ReturnType<typeof loadSecretariatPageData>>

const Intro = () => (
  <section className="mx-auto max-w-6xl px-6 pt-8 md:px-12 lg:px-16">
    <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
      {explainerTexts.mainHeader.headline}
    </h1>
    <ExplainerText />
    <p className="mt-4 text-sm font-medium text-un-blue">
      <Link href="/methodology" className="hover:underline">
        See the methodology
      </Link>
    </p>
  </section>
)

const Summary = ({ data }: { data: PageData }) => (
  <section className="mx-auto max-w-6xl px-6 pt-6 md:px-12 lg:px-16">
    <ActiveFilters
      entitiesData={data.entities}
      allOrgans={data.organs}
      citedVersionLabel={
        data.active.version ? `PPB ${data.active.version.ppb_year}` : undefined
      }
      className="mb-4"
    />
    <DirectoryExplorer
      cardStates={data.cardStates}
      allDocumentsCount={data.cards.allDocumentsCount}
      citedDocumentCount={data.cards.citedDocumentCount}
      versions={data.versions}
      activeVersionSlug={data.active.slug}
    />
  </section>
)

const Explorer = ({ dataPromise }: Pick<PageData, 'dataPromise'>) => (
  <section id="mandates" className="scroll-mt-20 pt-8 pb-10">
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-16">
          <LoadingSkeleton variant="list" count={4} />
        </div>
      }
    >
      <MandateExplorerServer dataPromise={dataPromise} />
    </Suspense>
  </section>
)

/** Composes the streamed Secretariat page from its initial data model. */
export const SecretariatPageView = ({ data }: { data: PageData }) => (
  <div>
    <Intro />
    <Summary data={data} />
    <Explorer dataPromise={data.dataPromise} />
    <FurtherResources />
  </div>
)
