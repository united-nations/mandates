/** Keep matching branches and their ancestors, preserving the original rows and order. */
export function searchTableRows<T extends { id: string; parentId?: string }>(
  rows: T[],
  query: string,
  text: (row: T) => string
): T[] {
  const needle = query.normalize('NFKC').trim().toLocaleLowerCase('en')
  if (!needle) return rows
  const byId = new Map(rows.map((row) => [row.id, row]))
  const matches = new Set(
    rows
      .filter((row) =>
        text(row).normalize('NFKC').toLocaleLowerCase('en').includes(needle)
      )
      .map((row) => row.id)
  )
  // Preorder input means descendants inherit a direct ancestor match in one pass.
  const branches = new Set(matches)
  for (const row of rows)
    if (row.parentId && branches.has(row.parentId)) branches.add(row.id)
  const included = new Set(branches)
  for (const id of branches) {
    let parent = byId.get(id)?.parentId
    while (parent && !included.has(parent)) {
      included.add(parent)
      parent = byId.get(parent)?.parentId
    }
  }
  return rows.filter((row) => included.has(row.id))
}
