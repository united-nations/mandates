/**
 * @file Directory request URL helper
 * @description Preserves the active Secretariat query string for lazy panels.
 *
 * Key exports:
 * - directoryRequestUrl() - Targets the directory endpoint with active filters.
 */

const DIRECTORY_ENDPOINT = '/api/secretariat/directories'
const DIRECTORY_PANELS = ['organs', 'catalogue', 'cited', 'entities'] as const

export type DirectoryPanel = (typeof DIRECTORY_PANELS)[number]
export type DirectoryResource = 'organs' | 'catalogue' | 'budget'

/** Maps two panels backed by the same hierarchy to one cached resource. */
export const directoryResource = (panel: DirectoryPanel): DirectoryResource =>
  panel === 'cited' || panel === 'entities' ? 'budget' : panel

/** Accepts only a known directory panel from an API query string. */
export const parseDirectoryPanel = (
  value: string | null
): DirectoryPanel | null =>
  DIRECTORY_PANELS.find((panel) => panel === value) ?? null

/** Builds the lazy directory endpoint URL for current filters. */
export const directoryRequestUrl = (
  search: string,
  panel: DirectoryPanel
): string => {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search
  )
  params.set('panel', panel)
  return `${DIRECTORY_ENDPOINT}?${params}`
}
