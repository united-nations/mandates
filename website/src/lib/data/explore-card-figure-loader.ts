/**
 * @file Database-backed explore-card figure loader
 * @description Connects pure card-count composition to mandate data readers.
 *
 * Key exports:
 * - getExploreCardFigures() - Loads live card figures.
 * - getExploreCardBaselineFigures() - Loads comparison figures.
 */

import { exploreCardBaselineFilters } from '@/lib/explore-card-state'
import type { FilterOptions } from '@/types'

import { loadExploreCardFigures } from './explore-card-figures'
import {
  exploreCardScopes,
  getFilteredDimensionCounts,
  getFilteredDocumentCount,
  getMandateCounts,
} from './mandates'

const loaders = {
  loadCounts: getMandateCounts,
  loadDimensions: getFilteredDimensionCounts,
  loadDocumentCount: getFilteredDocumentCount,
}

/** Loads the card figures for the active filter state. */
export const getExploreCardFigures = (filters: FilterOptions) =>
  loadExploreCardFigures({
    ...loaders,
    scopes: exploreCardScopes(filters),
  })

/** Loads card figures with card-owned selections removed. */
export const getExploreCardBaselineFigures = (filters: FilterOptions) =>
  getExploreCardFigures(exploreCardBaselineFilters(filters))
