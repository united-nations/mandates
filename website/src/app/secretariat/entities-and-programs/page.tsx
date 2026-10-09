import { explainerTexts } from '@/lib/en_text_contents'
import { EntitiesProgrammesTable } from '@/components/EntitiesProgrammesTable'
import { getBudgetVersions } from '@/lib/data/budget-documents'
import { getBudgetHierarchy } from '@/lib/data/mandates'
import { getAllEntities } from '@/lib/data/entities'
import { getExpenditureDatasets } from '@/lib/data/entity-expenditure'
import { matchBudgetLocationExpenditures } from '@/lib/budget-location-expenditure'
import { buildEntitiesProgrammesRows } from '@/lib/entities-programmes-tree'
import officialStructure from '@/lib/data/ppb-programme-structure-2027.json'
import {
  completeProgrammeRows,
  type OfficialProgrammeStructure,
} from '@/lib/complete-programme-tree'
import programmeClusters from '@/lib/data/ahwg-programme-clusters.json'
import {
  officialProgrammeClusterOptions,
  type ProgrammeClusterArtifact,
} from '@/lib/programme-cluster-model'
import { withRequestQueryCache } from '@/lib/db/request-query-cache'

export const metadata = {
  title: explainerTexts.secretariatNavigation.entitiesAndPrograms,
}

export default async function EntitiesAndProgramsPage() {
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
    // Always the latest published cycle; mandate-list facets do not prune it.
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
    return (
      <section className="mx-auto max-w-6xl px-2 pt-4 pb-10 sm:px-6 md:px-12 lg:px-16">
        <EntitiesProgrammesTable
          key={activeVersion}
          rows={rows}
          expenditures={expenditures}
          budgetVersion={activeVersion}
          clusters={officialProgrammeClusterOptions(
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
          )}
        />
      </section>
    )
  })
}
