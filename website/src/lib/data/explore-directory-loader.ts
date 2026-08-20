/**
 * @file Database-backed explore-directory loader
 * @description Connects panel-specific composition to mandate readers.
 *
 * Key exports:
 * - getExplorePanelData() - Loads one filter-scoped panel payload.
 */

import type { DirectoryPanel } from '@/lib/directory-request'
import type { FilterOptions } from '@/types'

import { loadExplorePanelData } from './explore-directory-data'
import {
  exploreCardScopes,
  getBudgetHierarchy,
  getDocumentTypeCatalogue,
  getOrganHierarchy,
  getSubjectHierarchy,
} from './mandates'

/** Loads one directory panel for the active filter scope. */
export const getExplorePanelData = (
  filters: FilterOptions,
  panel: DirectoryPanel
) => {
  const { facets } = exploreCardScopes(filters)
  return loadExplorePanelData(panel, {
    loadOrgans: () => getOrganHierarchy(facets),
    loadBudget: () => getBudgetHierarchy(facets),
    loadSubjects: () => getSubjectHierarchy(facets),
    loadTypes: () => getDocumentTypeCatalogue(facets),
  })
}
