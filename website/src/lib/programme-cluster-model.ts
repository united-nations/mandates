/** Exact, same-cycle workbook members projected onto the real citation hierarchy. */
import type { EntityProgrammeRow } from './entities-programmes-tree'
import type { ProgrammeCluster } from '../components/EntitiesProgrammesTable'

export interface ProgrammeClusterArtifact {
  version: string
  source: Record<string, unknown>
  clusters: { id: string; title: string; memberIds: string[] }[]
  members: {
    id: string
    budgetCycle: string
    entity: string
    programme: string
    subprogramme: string | null
    sourceIds: string[]
  }[]
  bindings: {
    memberId: string
    budgetVersion: string
    currentBudgetNodeId: string | null
    status: 'verified' | 'unsupported'
    reason?: string
    evidence: Record<string, unknown>
  }[]
  unclusteredMemberIds: string[]
}
interface ProgrammeClusterTarget {
  rows: EntityProgrammeRow[]
  budgetVersion: string
  budgetCycle: string
  unavailableText: string
  unverifiedText: string
}

/** Every one of the 191 workbook members must be clustered or explicitly unclustered. */
export function validateProgrammeClusters(source: ProgrammeClusterArtifact) {
  const ids = source.members.map((row) => row.id)
  const clustered = source.clusters.flatMap((row) => row.memberIds)
  const classified = [...clustered, ...source.unclusteredMemberIds]
  if (
    !source.version ||
    ids.length !== 191 ||
    new Set(ids).size !== 191 ||
    source.clusters.length !== 29 ||
    new Set(source.clusters.map((row) => row.id)).size !== 29 ||
    clustered.length !== 106 ||
    source.unclusteredMemberIds.length !== 85 ||
    classified.length !== 191 ||
    new Set(classified).size !== 191 ||
    classified.some((id) => !ids.includes(id))
  )
    throw new Error('AHWG programme source conservation failed')
  if (
    new Set(
      source.bindings.map((row) =>
        JSON.stringify([row.memberId, row.budgetVersion])
      )
    ).size !== source.bindings.length ||
    source.bindings.some(
      (row) =>
        !ids.includes(row.memberId) ||
        (row.status === 'verified'
          ? !row.currentBudgetNodeId || row.reason
          : row.status !== 'unsupported' ||
            row.currentBudgetNodeId !== null ||
            !row.reason)
    )
  )
    throw new Error('AHWG programme bindings are incomplete or conflicting')
  for (const version of new Set(
    source.bindings.map((row) => row.budgetVersion)
  ))
    if (
      source.bindings.filter((row) => row.budgetVersion === version).length !==
      191
    )
      throw new Error('AHWG programme target version loses source members')
  return source
}

/** Never promote workbook IDs or labels into current node identities. */
export function programmeClusterOptions(
  source: ProgrammeClusterArtifact,
  target: ProgrammeClusterTarget
): ProgrammeCluster[] {
  validateProgrammeClusters(source)
  const rows = new Set(target.rows.map((row) => row.id))
  const bindings = new Map(
    source.bindings
      .filter((row) => row.budgetVersion === target.budgetVersion)
      .map((row) => [row.memberId, row])
  )
  const members = new Map(source.members.map((row) => [row.id, row]))
  return source.clusters.map((cluster) => {
    const verified = cluster.memberIds
      .map((id) => bindings.get(id))
      .filter(
        (binding) =>
          binding?.status === 'verified' &&
          members.get(binding.memberId)?.budgetCycle === target.budgetCycle &&
          rows.has(binding.currentBudgetNodeId!)
      )
    const unsupportedCount = cluster.memberIds.length - verified.length
    const reasons = new Set(
      cluster.memberIds
        .filter((id) => !verified.some((row) => row?.memberId === id))
        .map((id) => bindings.get(id)?.reason ?? target.unverifiedText)
    )
    return {
      id: cluster.id,
      title: cluster.title,
      nodeIds: [...new Set(verified.map((row) => row!.currentBudgetNodeId!))],
      unsupportedCount,
      reason: unsupportedCount
        ? `${target.unavailableText.replace('{count}', String(unsupportedCount))} ${[...reasons].join(' ')}`
        : undefined,
    }
  })
}

interface OfficialProgrammeBindings {
  version: string
  budgetVersion: string
  budgetCycle: string
  rows: { id: string }[]
  memberDefinitions: {
    memberId: string
    rowIds: string[]
    status: string
    reason: string | null
    evidenceIds: string[]
  }[]
}

/** Use explicit official owner evidence, including whole programmes spanning sections. */
export function officialProgrammeClusterOptions(
  source: ProgrammeClusterArtifact,
  official: OfficialProgrammeBindings,
  target: ProgrammeClusterTarget
): ProgrammeCluster[] {
  validateProgrammeClusters(source)
  const members = new Set(source.members.map((member) => member.id))
  const definitions = new Map(
    official.memberDefinitions.map((definition) => [
      definition.memberId,
      definition,
    ])
  )
  const rows = new Set(official.rows.map((row) => row.id))
  if (
    !official.version ||
    definitions.size !== members.size ||
    official.memberDefinitions.length !== members.size ||
    [...definitions.keys()].some((id) => !members.has(id)) ||
    official.memberDefinitions.some((definition) =>
      definition.status === 'verified'
        ? !definition.rowIds.length ||
          !definition.evidenceIds.length ||
          definition.rowIds.some((id) => !rows.has(id))
        : definition.status !== 'unsupported' || !definition.reason
    )
  )
    throw new Error('Official programme member bindings lack source evidence')
  const available =
    official.budgetVersion === target.budgetVersion &&
    official.budgetCycle === target.budgetCycle
  const targetRows = new Set(target.rows.map((row) => row.id))
  return source.clusters.map((cluster) => {
    const matched = cluster.memberIds.filter((id) => {
      const definition = definitions.get(id)!
      return (
        available &&
        definition.status === 'verified' &&
        source.members.find((member) => member.id === id)?.budgetCycle ===
          target.budgetCycle &&
        definition.rowIds.every((rowId) => targetRows.has(rowId))
      )
    })
    const unsupported = cluster.memberIds.filter((id) => !matched.includes(id))
    const reasons = [
      ...new Set(
        unsupported.map(
          (id) => definitions.get(id)?.reason ?? target.unverifiedText
        )
      ),
    ]
    return {
      id: cluster.id,
      title: cluster.title,
      nodeIds: [
        ...new Set(matched.flatMap((id) => definitions.get(id)!.rowIds)),
      ],
      unsupportedCount: unsupported.length,
      reason: unsupported.length
        ? `${target.unavailableText.replace('{count}', String(unsupported.length))} ${reasons.join(' ')}`
        : undefined,
    }
  })
}
