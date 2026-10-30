import { OpenSharedMandate } from '@/components/OpenSharedMandate'
import { Suspense } from 'react'

import { MandateExplorerServer } from '@/app/_mandateExplorerServer'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'

import { FurtherResources } from './FurtherResources'
import type { loadSecretariatPageData } from './page-data'

type PageData = Awaited<ReturnType<typeof loadSecretariatPageData>>

const Explorer = ({
  dataPromise,
  versions,
  active,
  filters,
}: Pick<PageData, 'dataPromise' | 'versions' | 'active' | 'filters'>) => (
  <section id="mandates" className="scroll-mt-20 pt-3 pb-10">
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-16">
          <LoadingSkeleton variant="list" count={4} />
        </div>
      }
    >
      <MandateExplorerServer
        filters={filters}
        dataPromise={dataPromise}
        versions={versions}
        activeVersionSlug={active.slug}
      />
    </Suspense>
  </section>
)

/** Composes the streamed Secretariat page from its initial data model. */
export const SecretariatPageView = ({ data }: { data: PageData }) => (
  <div>
    <OpenSharedMandate />
    <Explorer
      filters={data.filters}
      dataPromise={data.dataPromise}
      versions={data.versions}
      active={data.active}
    />
    <FurtherResources />
  </div>
)
