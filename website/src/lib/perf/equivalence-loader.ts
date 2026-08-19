/** Loads the complete pre-lazy Secretariat artifact for digest comparison. */

import { getBudgetVersions } from '@/lib/data/budget-documents'
import { getAllEntities } from '@/lib/data/entities'
import {
  getExploreCardBaselineFigures,
  getExploreCardFigures,
} from '@/lib/data/explore-card-figure-loader'
import { getExploreDirectoryData } from '@/lib/data/explore-directory-loader'
import { getMandatePageData } from '@/lib/data/mandates'
import { getAllOrgans } from '@/lib/data/organs'
import type { FilterOptions } from '@/types'

import { assembleExploreCardData } from './equivalence-artifact'

/** Reconstructs the complete payload used by the original benchmark. */
export const loadEquivalenceArtifact = async (filters: FilterOptions) => {
  const [
    pageData,
    versions,
    entities,
    organs,
    figures,
    cardBaseline,
    directories,
  ] = await Promise.all([
    getMandatePageData(filters),
    getBudgetVersions(),
    getAllEntities(),
    getAllOrgans(),
    getExploreCardFigures(filters),
    getExploreCardBaselineFigures(filters),
    getExploreDirectoryData(filters),
  ])
  const cards = assembleExploreCardData({ directories, figures })
  return { cardBaseline, cards, entities, organs, pageData, versions }
}
