import assert from 'node:assert/strict'
import test from 'node:test'

import { loadExploreCardFigures } from '#lib/data/explore-card-figures'
import type { FilterOptions } from '@/types'

const scopes = {
  facets: {} as FilterOptions,
  allDocuments: {} as FilterOptions,
  cited: { cited: '1' } as FilterOptions,
}

test('reuses the aggregate total when cited is not active', async () => {
  let countLoads = 0
  const result = await loadExploreCardFigures({
    scopes,
    loadCounts: async () => ({ totalDocuments: 40, totalOrgans: 4 }),
    loadDimensions: async () => ({ organs: 4, entities: 6 }),
    loadDocumentCount: async () => {
      countLoads += 1
      return 10
    },
  })

  assert.deepEqual(result, {
    organCount: 4,
    entityCount: 6,
    allDocumentsCount: 40,
    citedDocumentCount: 10,
  })
  assert.equal(countLoads, 1)
})

test('loads the wider total when cited is active', async () => {
  const loads: Array<string | undefined> = []
  const result = await loadExploreCardFigures({
    scopes: { ...scopes, facets: { cited: '1' } },
    loadCounts: async () => ({ totalDocuments: 10, totalOrgans: 4 }),
    loadDimensions: async () => ({ organs: 4, entities: 6 }),
    loadDocumentCount: async (filters) => {
      loads.push(filters.cited)
      return filters.cited === '1' ? 10 : 40
    },
  })

  assert.equal(result.allDocumentsCount, 40)
  assert.equal(result.citedDocumentCount, 10)
  assert.deepEqual(loads, ['1', undefined])
})
