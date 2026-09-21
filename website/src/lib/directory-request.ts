/**
 * @file Directory request URL helper
 * @description Preserves the active Secretariat query string for lazy panels.
 *
 * Key exports:
 * - directoryScopeKey() - Canonicalises the filters a payload depends on.
 * - directoryRequestUrl() - Targets the directory endpoint with active filters.
 */

const DIRECTORY_ENDPOINT = '/api/secretariat/directories'
const DIRECTORY_PANELS = ['organs', 'catalogue', 'cited', 'entities'] as const

export type DirectoryPanel = (typeof DIRECTORY_PANELS)[number]
export type DirectoryResource = 'organs' | 'catalogue' | 'budget'

/**
 * Pagination, grouping and sort order. The server drops all four before it
 * counts anything (exploreCardScopes), so a panel payload cannot depend on
 * them; carrying them would make a page turn in the table below look, to the
 * cache key, like a different question.
 */
const IGNORED_BY_EVERY_PANEL = ['page', 'limit', 'group', 'sort_by']

/** Maps two panels backed by the same hierarchy to one cached resource. */
export const directoryResource = (panel: DirectoryPanel): DirectoryResource =>
  panel === 'cited' || panel === 'entities' ? 'budget' : panel

/** Accepts only a known directory panel from an API query string. */
export const parseDirectoryPanel = (
  value: string | null
): DirectoryPanel | null =>
  DIRECTORY_PANELS.find((panel) => panel === value) ?? null

/**
 * The filters one resource's payload actually depends on, in a fixed order, so
 * that two query strings meaning the same thing are the same string. This is
 * the cache key as well as the request, which is what makes "same key, no
 * request" true by construction rather than by a second rule kept in step.
 *
 * `cited` is dropped for the budget hierarchy. That filter asks for the
 * documents the selected version cites, and the hierarchy is assembled from
 * that version's citation rows to begin with, so every document it counts
 * already satisfies it and the clause adds nothing. The panel shows this
 * live: switching scope leaves all three stream counts where they were.
 */
export const directoryScopeKey = (
  search: string,
  resource: DirectoryResource
): string => {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search
  )
  for (const key of IGNORED_BY_EVERY_PANEL) params.delete(key)
  if (resource === 'budget') params.delete('cited')
  params.sort()
  return params.toString()
}

/** Builds the lazy directory endpoint URL for current filters. */
export const directoryRequestUrl = (
  search: string,
  panel: DirectoryPanel
): string => {
  const params = new URLSearchParams(
    directoryScopeKey(search, directoryResource(panel))
  )
  params.set('panel', panel)
  return `${DIRECTORY_ENDPOINT}?${params}`
}
