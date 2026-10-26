import {
  getBudgetVersions,
  getDefaultVersionSlug,
} from '@/lib/data/budget-documents'
import { getAllEntities } from '@/lib/data/entities'
import { getMandatePageData } from '@/lib/data/mandates'
import { getAllOrgans } from '@/lib/data/organs'
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
  const [versions, entities, organs] = await Promise.all([
    getBudgetVersions(),
    getAllEntities(),
    getAllOrgans(),
  ])
  return {
    active: activeVersion(filters, versions),
    dataPromise,
    entities,
    organs,
    versions,
  }
}
