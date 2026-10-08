import { Suspense } from 'react'

import { MandateExplorerServer } from '@/app/_mandateExplorerServer'
import { ActiveFilters } from '@/components/ActiveFilters'
import { DirectoryExplorer } from '@/components/DirectoryExplorer'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'

import { FurtherResources } from './FurtherResources'
import type { loadSecretariatPageData } from './page-data'

type PageData = Awaited<ReturnType<typeof loadSecretariatPageData>>

const Summary = ({ data }: { data: PageData }) => (
  <section className="mx-auto max-w-6xl px-6 pt-6 md:px-12 lg:px-16">
    <ActiveFilters
      entitiesData={data.entities}
      allOrgans={data.organs}
      citedVersionLabel={
        data.active.version
          ? `UN Programme Budget ${data.active.version.ppb_year}`
          : undefined
      }
      className="mb-4"
    />
    <DirectoryExplorer
      cardStates={data.cardStates}
      allDocumentsCount={data.cards.documentsCount}
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
    <Summary data={data} />
    <Explorer dataPromise={data.dataPromise} />
    <FurtherResources />
  </div>
)
