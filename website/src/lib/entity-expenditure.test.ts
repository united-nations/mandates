import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  parseExpenditureDataset,
  matchEntityExpenditure,
} from '#lib/entity-expenditure'

const node = (
  id: string,
  label: string,
  values: Record<string, number>,
  extra = {}
) => ({
  id,
  label,
  parentId: null,
  tier: 'budget_unit',
  kind: 'entity',
  values,
  amount: Object.values(values).reduce((a, b) => a + b, 0),
  ...extra,
})
const data = (nodes: unknown[], stream: 'ppb' | 'pko' = 'ppb') =>
  parseExpenditureDataset(
    {
      meta: {
        year: 2025,
        measure: 'expenditure',
        currency: 'USD',
        fiscalYear: stream === 'ppb' ? '2025' : '2024/25',
        stream,
      },
      nodes,
    },
    stream
  )

test('uses authoritative section rather than adding its duplicate child', () => {
  const d = data([
    node(
      's',
      'Human settlements',
      { regular_budget: 10, extrabudgetary: 30 },
      {
        tier: 'section',
        kind: 'section',
        entityStatus: 'single_owner',
        entity: { name: 'UN-Habitat', acronym: 'UN-Habitat' },
      }
    ),
    node(
      'child',
      'UN-Habitat',
      { regular_budget: 11, extrabudgetary: 30 },
      { parentId: 's' }
    ),
  ])
  const r = matchEntityExpenditure('UN-Habitat', undefined, [d])
  assert.equal(r.status, 'matched')
  if (r.status === 'matched') {
    assert.equal(r.amount, 40)
    assert.deepEqual(r.nodeIds, ['s'])
  }
})
test('finds mission entities below budget units', () => {
  const d = data([
    node('s', 'Special political missions', { regular_budget: 20 }),
    node(
      'mission',
      'UNAMA',
      { regular_budget: 10 },
      { parentId: 's', tier: 'detail', kind: 'subprogramme' }
    ),
  ])
  const r = matchEntityExpenditure('UNAMA', undefined, [d])
  assert.equal(r.status, 'matched')
  if (r.status === 'matched') assert.equal(r.amount, 10)
})
test('sums disjoint funding sources but refuses overlap or different scopes', () => {
  const a = node('a', 'Office A', { regular_budget: 10 })
  const b = node('b', 'Office A', { extrabudgetary: 20 })
  const r = matchEntityExpenditure('A', 'Office A', [data([a, b])])
  if (r.status !== 'matched') assert.fail('Expected match')
  assert.equal(r.amount, 30)
  assert.equal(
    matchEntityExpenditure('A', 'Office A', [
      data([a, { ...b, values: { regular_budget: 20 } }]),
    ]).status,
    'unavailable'
  )
})
test('does not fuzzy-match unknown entities or substitute RCS for DCO', () => {
  const d = data([
    node('rcs', 'Resident coordinator system', { regular_budget: 66842300 }),
  ])
  assert.deepEqual(matchEntityExpenditure('DCO', undefined, [d]), {
    status: 'unavailable',
    reason: 'dco_scope',
  })
  assert.equal(
    matchEntityExpenditure('Resident office', undefined, [d, d]).status,
    'unavailable'
  )
  assert.deepEqual(matchEntityExpenditure('UNSOH', undefined, []), {
    status: 'unavailable',
    reason: 'unsoh_period',
  })
})
test('zero remains zero and absent funding is not added as zero', () => {
  const r = matchEntityExpenditure('A', undefined, [
    data([node('a', 'A', { regular_budget: 0 })]),
  ])
  if (r.status !== 'matched') assert.fail('Expected zero match')
  assert.equal(r.amount, 0)
  assert.equal(r.funding.extrabudgetary, undefined)
})
test('enforces measure, period, currency, hierarchy and arithmetic', () => {
  const raw = {
    meta: {
      year: 2025,
      measure: 'expenditure',
      currency: 'USD',
      fiscalYear: '2025',
      stream: 'ppb',
    },
    nodes: [node('a', 'A', { regular_budget: 10 })],
  }
  for (const meta of [
    { year: 2024 },
    { measure: 'proposed' },
    { currency: 'EUR' },
    { fiscalYear: '2024/25' },
  ])
    assert.throws(() =>
      parseExpenditureDataset({ ...raw, meta: { ...raw.meta, ...meta } }, 'ppb')
    )
  assert.throws(() =>
    data([node('a', 'A', { regular_budget: 10 }, { amount: 12 })])
  )
  assert.throws(() =>
    data([node('a', 'A', { regular_budget: 10 }, { parentId: 'missing' })])
  )
  assert.throws(() =>
    data([node('a', 'A', { regular_budget: 10 }, { parentId: 'a' })])
  )
  assert.throws(() =>
    data([
      node('a', 'A', { regular_budget: 10 }),
      node('a', 'B', { regular_budget: 20 }),
    ])
  )
})
test('reviewed Brindisi alias selects PKO period and retains source URL', () => {
  const r = matchEntityExpenditure('UNGSC Brindisi', undefined, [
    data(
      [node('UNLB', 'UNLB', { other_assessed: 42 }, { tier: 'mission' })],
      'pko'
    ),
  ])
  if (r.status !== 'matched') assert.fail('Expected match')
  assert.equal(r.period, '2024/25')
  assert.equal(r.amount, 42)
  assert.match(r.datasetUrl, /budget-audited-pko-2025.json$/)
})

test('entity identity outranks a same-name capital allocation', () => {
  const r = matchEntityExpenditure('ECA', 'Economic Commission for Africa', [
    data([
      node(
        'entity',
        'Economic Commission for Africa',
        { regular_budget: 100 },
        { entity: { name: 'Economic Commission for Africa', acronym: 'ECA' } }
      ),
      node(
        'allocation',
        'ECA',
        { regular_budget: 5 },
        { tier: 'detail', kind: 'component' }
      ),
    ]),
  ])
  if (r.status !== 'matched') assert.fail('Expected authoritative entity match')
  assert.equal(r.amount, 100)
  assert.deepEqual(r.nodeIds, ['entity'])
})
