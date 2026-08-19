import assert from 'node:assert/strict'
import test from 'node:test'

import { assembleExploreCardData } from '#lib/perf/equivalence-artifact'

test('reconstructs the original eager card-property order', () => {
  const result = assembleExploreCardData({
    directories: {
      organGroups: ['organs'],
      budgetStreams: ['budget'],
      subjectDomains: ['subjects'],
      documentTypes: { types: [] },
    },
    figures: {
      organCount: 4,
      entityCount: 5,
      allDocumentsCount: 40,
      citedDocumentCount: 10,
    },
  })

  assert.deepEqual(Object.keys(result), [
    'organGroups',
    'budgetStreams',
    'subjectDomains',
    'documentTypes',
    'organCount',
    'entityCount',
    'allDocumentsCount',
    'citedDocumentCount',
  ])
})
