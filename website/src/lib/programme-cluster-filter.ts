import type { EntityProgrammeRow } from './entities-programmes-tree'

/** Members and their descendants matching the search, plus ancestor context. */
export function clusterProgrammeRows(
  rows: EntityProgrammeRow[],
  memberIds: readonly string[],
  query: string
): EntityProgrammeRow[] {
  const members = new Set(memberIds)
  const needle = query.normalize('NFKC').trim().toLocaleLowerCase('en')
  const byId = new Map(rows.map((row) => [row.id, row]))
  const belongsToCluster = (row: EntityProgrammeRow) => {
    let current: EntityProgrammeRow | undefined = row
    const seen = new Set<string>()
    while (current && !seen.has(current.id)) {
      if (members.has(current.id)) return true
      seen.add(current.id)
      current = current.parentId ? byId.get(current.parentId) : undefined
    }
    return false
  }
  const matches = rows.filter(
    (row) =>
      belongsToCluster(row) &&
      [row.label, row.detail, row.entityCode]
        .filter(Boolean)
        .join(' ')
        .normalize('NFKC')
        .toLocaleLowerCase('en')
        .includes(needle)
  )
  const included = new Set(matches.map((row) => row.id))
  for (const row of matches) {
    let parent = row.parentId
    while (parent && !included.has(parent)) {
      included.add(parent)
      parent = byId.get(parent)?.parentId
    }
  }
  return rows.filter((row) => included.has(row.id))
}
