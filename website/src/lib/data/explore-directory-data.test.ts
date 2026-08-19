import assert from 'node:assert/strict'
import test from 'node:test'

import { loadExploreDirectoryData } from '#lib/data/explore-directory-data'

test('loads all four directory payloads concurrently and preserves names', async () => {
  const calls: string[] = []
  const mark = <T>(name: string, value: T) => async () => {
    calls.push(name)
    return value
  }
  const result = await loadExploreDirectoryData({
    loadOrgans: mark('organs', [{ id: 'o' }]),
    loadBudget: mark('budget', [{ type: 'ppb' }]),
    loadSubjects: mark('subjects', [{ code: '01' }]),
    loadTypes: mark('types', { types: [], totalCount: 4, untypedCount: 4 }),
  })

  assert.deepEqual(calls.sort(), ['budget', 'organs', 'subjects', 'types'])
  assert.deepEqual(Object.keys(result).sort(), [
    'budgetStreams',
    'documentTypes',
    'organGroups',
    'subjectDomains',
  ])
})
