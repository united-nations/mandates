/**
 * @file Database-backed explore-directory loader
 * @description Connects lazy directory composition to mandate readers.
 *
 * Key exports:
 * - getExploreDirectoryData() - Loads filter-scoped directory payloads.
 */

import type { FilterOptions } from '@/types'

import { loadExploreDirectoryData } from './explore-directory-data'
import {
  exploreCardScopes,
  getBudgetHierarchy,
  getDocumentTypeCatalogue,
  getOrganHierarchy,
  getSubjectHierarchy,
} from './mandates'

/** Loads all directory panels for the active filter scope. */
export const getExploreDirectoryData = (filters: FilterOptions) => {
  const { facets } = exploreCardScopes(filters)
  return loadExploreDirectoryData({
    loadOrgans: () => getOrganHierarchy(facets),
    loadBudget: () => getBudgetHierarchy(facets),
    loadSubjects: () => getSubjectHierarchy(facets),
    loadTypes: () => getDocumentTypeCatalogue(facets),
  })
}
