import type { Metadata } from 'next'

import { withRequestQueryCache } from '@/lib/db/request-query-cache'
import { explainerTexts } from '@/lib/en_text_contents'
import { parseSearchParams } from '@/lib/filter-constants'

import { loadSecretariatPageData } from './page-data'
import { SecretariatPageView } from './page-view'

export const metadata: Metadata = {
  title: 'UN Secretariat View',
  description: explainerTexts.mainHeader.shortDescriptionPlain,
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
