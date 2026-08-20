import assert from 'node:assert/strict'
import test from 'node:test'

import { loadExplorePanelData } from '#lib/data/explore-directory-data'

const loaders = (calls: string[]) => {
  const mark = <T>(name: string, value: T) => async () => {
    calls.push(name)
    return value
  }
  return {
    loadOrgans: mark('organs', [{ id: 'o' }]),
    loadBudget: mark('budget', [{ type: 'ppb' }]),
    loadSubjects: mark('subjects', [{ code: '01' }]),
    loadTypes: mark('types', { types: [], totalCount: 4, untypedCount: 4 }),
  }
}

test('the organs panel loads only organ groups', async () => {
  const calls: string[] = []
  const result = await loadExplorePanelData('organs', loaders(calls))

  assert.deepEqual(calls, ['organs'])
  assert.deepEqual(result, { organGroups: [{ id: 'o' }] })
})

test('the catalogue panel loads only subjects and document types', async () => {
  const calls: string[] = []
  const result = await loadExplorePanelData('catalogue', loaders(calls))

  assert.deepEqual(calls.sort(), ['subjects', 'types'])
  assert.deepEqual(result, {
    subjectDomains: [{ code: '01' }],
    documentTypes: { types: [], totalCount: 4, untypedCount: 4 },
  })
})

test('both budget-backed panels load only the shared budget hierarchy', async () => {
  for (const panel of ['cited', 'entities'] as const) {
    const calls: string[] = []
    const result = await loadExplorePanelData(panel, loaders(calls))

    assert.deepEqual(calls, ['budget'])
    assert.deepEqual(result, { budgetStreams: [{ type: 'ppb' }] })
  }
})
