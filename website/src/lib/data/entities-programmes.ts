import { explainerTexts } from '../en_text_contents'
import { getBudgetVersions } from './budget-documents'
import { getBudgetHierarchy } from './mandates'
import { getAllEntities } from './entities'
import { getExpenditureDatasets } from './entity-expenditure'
import { matchBudgetLocationExpenditures } from '../budget-location-expenditure'
import { buildEntitiesProgrammesRows } from '../entities-programmes-tree'
import officialStructure from './ppb-programme-structure-2027.json'
import {
  completeProgrammeRows,
  type OfficialProgrammeStructure,
} from '../complete-programme-tree'
import programmeClusters from './ahwg-programme-clusters.json'
import {
  officialProgrammeClusterOptions,
  type ProgrammeClusterArtifact,
} from '../programme-cluster-model'
import { withRequestQueryCache } from '../db/request-query-cache'

/** Shared complete tree for the website and public API; serves the latest cycle only. */
export async function getEntitiesProgrammesData() {
  return withRequestQueryCache(async () => {
    const [versions, entities] = await Promise.all([
      getBudgetVersions(),
      getAllEntities(),
    ])
    const latest = [...versions].sort(
      (a, b) => b.ppb_year - a.ppb_year || b.sort_order - a.sort_order
    )[0]
    if (!latest) throw new Error('No citation budget cycle is available')
    const activeVersion = latest.slug
    // Mandate-list facets never prune the selected cycle’s complete structure.
    const hierarchy = await getBudgetHierarchy({ ppb_version: activeVersion })
    const rows = completeProgrammeRows(
      buildEntitiesProgrammesRows(hierarchy),
      officialStructure as OfficialProgrammeStructure,
      activeVersion
    )
    const names = new Map(
      entities.map((entity) => [entity.entity, entity.entity_long])
    )
    const expenditures = matchBudgetLocationExpenditures(
      rows,
      await getExpenditureDatasets(),
      names
    )
    return {
      budgetVersion: latest,
      rows,
      expenditures,
      clusters: officialProgrammeClusterOptions(
        programmeClusters as ProgrammeClusterArtifact,
        officialStructure,
        {
          rows,
          budgetVersion: activeVersion,
          budgetCycle: String(latest.ppb_year),
          unavailableText:
            explainerTexts.entitiesAndProgrammes.clusterUnavailable,
          unverifiedText:
            explainerTexts.entitiesAndProgrammes.unverifiedCluster,
        }
      ),
    }
  })
}
