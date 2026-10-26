import { connection } from 'next/server'

import { SecretariatNavigation } from '@/components/SecretariatNavigation'
import {
  getBudgetVersions,
  getDefaultVersionSlug,
} from '@/lib/data/budget-documents'
import { getExploreCardFigures } from '@/lib/data/explore-card-figure-loader'

/** Shared navigation uses the default budget, independently of list filters. */
export async function SecretariatNavigationServer() {
  await connection()
  const versions = await getBudgetVersions()
  const slug = getDefaultVersionSlug(versions)
  const counts = await getExploreCardFigures({ ppb_version: slug })
  return <SecretariatNavigation counts={counts} />
}
