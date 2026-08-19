import {
  getExploreCardBaselineFigures,
  getExploreCardFigures,
} from '@/lib/data/explore-card-figure-loader'
import {
  getBudgetVersions,
  getDefaultVersionSlug,
} from '@/lib/data/budget-documents'
import { getAllEntities } from '@/lib/data/entities'
import { getMandatePageData } from '@/lib/data/mandates'
import { getAllOrgans } from '@/lib/data/organs'
import { resolveExploreCardStates } from '@/lib/explore-card-state'
import type { FilterOptions } from '@/types'

type Entities = Awaited<ReturnType<typeof getAllEntities>>
type Organs = Awaited<ReturnType<typeof getAllOrgans>>

const organLabel = (filters: FilterOptions, organs: Organs) =>
  filters.organ
    ? {
        code: filters.organ,
        longName:
          organs.find((organ) => organ.short === filters.organ)?.long ?? null,
      }
    : undefined

const entityLabel = (filters: FilterOptions, entities: Entities) =>
  filters.entity
    ? {
        code: filters.entity,
        longName:
          entities.find((entity) => entity.entity === filters.entity)
            ?.entity_long ?? null,
      }
    : undefined

const selectedLabels = (
  filters: FilterOptions,
  entities: Entities,
  organs: Organs
) => ({
  organ: organLabel(filters, organs),
  entity: entityLabel(filters, entities),
  citedOnly: filters.cited === '1',
})

const activeVersion = (
  filters: FilterOptions,
  versions: Awaited<ReturnType<typeof getBudgetVersions>>
) => {
  const slug =
    versions.find((version) => version.slug === filters.ppb_version)?.slug ??
    getDefaultVersionSlug(versions)
  return { slug, version: versions.find((item) => item.slug === slug) }
}

/** Starts the table immediately and resolves only initial-page card data. */
export const loadSecretariatPageData = async (filters: FilterOptions) => {
  const dataPromise = getMandatePageData(filters)
  const [versions, entities, organs, cards, baseline] = await Promise.all([
    getBudgetVersions(),
    getAllEntities(),
    getAllOrgans(),
    getExploreCardFigures(filters),
    getExploreCardBaselineFigures(filters),
  ])
  const active = activeVersion(filters, versions)
  const cardStates = resolveExploreCardStates(
    cards,
    baseline,
    selectedLabels(filters, entities, organs)
  )
  return { active, cards, cardStates, dataPromise, entities, organs, versions }
}
