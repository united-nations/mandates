/**
 * @file Explore-card count loader
 * @description Loads only the figures required before directory panels open.
 *
 * Key exports:
 * - loadExploreCardFigures() - Combines injected count readers.
 */

import type { ExploreCardFigures } from '#lib/explore-card-state'
import type { FilterOptions } from '@/types'

interface CardScopes {
  facets: FilterOptions
  allDocuments: FilterOptions
  cited: FilterOptions
}

interface FigureLoaders {
  loadCounts: (filters: FilterOptions) => Promise<{ totalDocuments: number }>
  loadDimensions: (
    filters: FilterOptions
  ) => Promise<{ organs: number; entities: number }>
  loadDocumentCount: (filters: FilterOptions) => Promise<number>
}

interface FigureLoadOptions extends FigureLoaders {
  scopes: CardScopes
}

const loadDocumentFigures = async (options: FigureLoadOptions) => {
  const { facets, allDocuments, cited } = options.scopes
  const citedCount = options.loadDocumentCount(cited)
  const allCount = facets.cited
    ? options.loadDocumentCount(allDocuments)
    : options.loadCounts(facets).then((counts) => counts.totalDocuments)
  return Promise.all([allCount, citedCount])
}

/** Loads four figures while avoiding a redundant all-documents count. */
export const loadExploreCardFigures = async (
  options: FigureLoadOptions
): Promise<ExploreCardFigures> => {
  const [dimensions, [allDocumentsCount, citedDocumentCount]] =
    await Promise.all([
      options.loadDimensions(options.scopes.facets),
      loadDocumentFigures(options),
    ])
  return {
    organCount: dimensions.organs,
    entityCount: dimensions.entities,
    allDocumentsCount,
    citedDocumentCount,
  }
}
