import { connection } from 'next/server'

import { SecretariatNavigation } from '@/components/SecretariatNavigation'
import {
  getBudgetVersions,
  getDefaultVersionSlug,
} from '@/lib/data/budget-documents'
import { getExploreCardFigures } from '@/lib/data/explore-card-figure-loader'
import { getMandatedSgReportCount } from '@/lib/data/mandated-sg-reports'

/** Shared navigation uses the default budget, independently of list filters. */
export async function SecretariatNavigationServer() {
  await connection()
  const versions = await getBudgetVersions()
  const slug = getDefaultVersionSlug(versions)
  const [counts, reportsCount] = await Promise.all([
    getExploreCardFigures({ ppb_version: slug }),
    getMandatedSgReportCount(),
  ])
  return <SecretariatNavigation counts={counts} reportsCount={reportsCount} />
}
