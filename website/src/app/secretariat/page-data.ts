import {
  getBudgetVersions,
  getDefaultVersionSlug,
} from '@/lib/data/budget-documents'
import { getMandatePageData } from '@/lib/data/mandates'
import type { FilterOptions } from '@/types'

const activeVersion = (
  filters: FilterOptions,
  versions: Awaited<ReturnType<typeof getBudgetVersions>>
) => {
  const slug =
    versions.find((version) => version.slug === filters.ppb_version)?.slug ??
    getDefaultVersionSlug(versions)
  return { slug, version: versions.find((item) => item.slug === slug) }
}

/** Starts the table immediately; registry navigation loads in the shared layout. */
export const loadSecretariatPageData = async (filters: FilterOptions) => {
  const dataPromise = getMandatePageData(filters)
  const versions = await getBudgetVersions()
  return {
    active: activeVersion(filters, versions),
    dataPromise,
    filters,
    versions,
  }
}
