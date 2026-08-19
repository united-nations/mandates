/**
 * @file Directory request URL helper
 * @description Preserves the active Secretariat query string for lazy panels.
 *
 * Key exports:
 * - directoryRequestUrl() - Targets the directory endpoint with active filters.
 */

const DIRECTORY_ENDPOINT = '/api/secretariat/directories'

/** Builds the lazy directory endpoint URL for current filters. */
export const directoryRequestUrl = (search: string): string => {
  const query = search.startsWith('?') ? search.slice(1) : search
  return query ? `${DIRECTORY_ENDPOINT}?${query}` : DIRECTORY_ENDPOINT
}
