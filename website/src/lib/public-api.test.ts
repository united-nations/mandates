import { test } from 'node:test'
import assert from 'node:assert/strict'
import { publicQuery, ApiInputError } from '#lib/public-api'

test('API pagination reaches past the UI offset boundary', () => {
  const query = publicQuery(
    new URLSearchParams('page=2000&limit=100&entity=DESA')
  )
  assert.equal(query.page, 2000)
  assert.equal(query.filters.entity, 'DESA')
  assert.equal(query.limit, 100)
})
test('ambiguous and malformed paging is rejected', () => {
  for (const input of [
    'page=0',
    'page=-1',
    'page=1.5',
    'page=9007199254740992',
    'limit=no',
    'start_year=10000',
    'min_citations=1000001',
    'entity=A&entity=B',
  ]) {
    assert.throws(() => publicQuery(new URLSearchParams(input)), ApiInputError)
  }
})
test('structured budget-location filters retain shared parser semantics', () => {
  const query = publicQuery(
    new URLSearchParams('mode=active_mandates&ppb_version=ppb2026')
  )
  assert.equal(query.filters.cited, '1')
  assert.equal(query.filters.ppb_version, 'ppb2026')
})
