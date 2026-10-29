import type { Metadata } from 'next'

import { withRequestQueryCache } from '@/lib/db/request-query-cache'
import { explainerTexts } from '@/lib/en_text_contents'
import { FILTER_PARAMS, parseSearchParams } from '@/lib/filter-constants'

import { loadSecretariatPageData } from './page-data'
import { SecretariatPageView } from './page-view'

const baseMetadata: Metadata = {
  title: explainerTexts.pageTitles.sources,
  description: explainerTexts.mainHeader.shortDescriptionPlain,
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams
  const hasQuery = Object.entries(params).some(
    ([key, value]) =>
      (key === 'mode' || FILTER_PARAMS.some((parameter) => parameter === key)) &&
      value !== undefined &&
      value !== ''
  )
  return {
    ...baseMetadata,
    ...(hasQuery
      ? { robots: { index: false, follow: true } }
      : { alternates: { canonical: '/secretariat' } }),
  }
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Loads the page inside one SQL-deduplication scope. */
export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams
  return withRequestQueryCache(async () => {
    const data = await loadSecretariatPageData(parseSearchParams(params))
    return <SecretariatPageView data={data} />
  })
}
