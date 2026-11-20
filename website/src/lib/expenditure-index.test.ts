import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createEntityExpenditureMatcher,
  type ExpenditureDataset,
} from '#lib/entity-expenditure'

test('one matcher indexes dataset names once for repeated entity lookups', () => {
  let labelReads = 0
  const dataset: ExpenditureDataset = {
    meta: {
      year: 2025,
      measure: 'expenditure',
      currency: 'USD',
      fiscalYear: '2025',
      stream: 'ppb',
    },
    url: 'https://example.org/data.json',
    nodes: [
      {
        id: 'a',
        parentId: null,
        tier: 'entity',
        kind: 'entity',
        get label() {
          labelReads++
          return 'Office A'
        },
        amount: 1,
        values: { regular_budget: 1 },
      },
    ],
  }
  const match = createEntityExpenditureMatcher([dataset])
  const indexedReads = labelReads
  for (let i = 0; i < 100; i++)
    assert.equal(match('Office A', undefined).status, 'matched')
  assert.equal(
    labelReads,
    indexedReads,
    'dataset labels must not be rescanned for each entity'
  )
})

test('scope lookup preserves order and does not share node IDs across datasets', async () => {
  const { createExpenditureScopes } = await import('#lib/expenditure-scopes')
  const make = (amount: number): ExpenditureDataset => ({
    meta: {
      year: 2025,
      measure: 'expenditure',
      currency: 'USD',
      fiscalYear: '2025',
      stream: 'ppb',
    },
    url: `https://example.org/${amount}.json`,
    nodes: [
      {
        id: 'child',
        parentId: 'root',
        tier: 'entity',
        kind: 'entity',
        label: 'Office A',
        amount,
        values: { regular_budget: amount },
      },
      {
        id: 'root',
        parentId: null,
        tier: 'part',
        kind: 'part',
        label: 'Part',
        amount,
        values: { regular_budget: amount },
      },
    ],
  })
  const a = make(1),
    b = make(2)
  const { descendants, scope } = createExpenditureScopes([a, b])
  assert.deepEqual(
    descendants(a, ['root']).map((n) => n.id),
    ['child', 'root']
  )
  assert.equal(scope(a, 'root'), scope(a, 'root'))
  const aa = scope(a, 'root').match('Office A')
  const bb = scope(b, 'root').match('Office A')
  assert.equal(aa.status === 'matched' && aa.amount, 1)
  assert.equal(bb.status === 'matched' && bb.amount, 2)
})
